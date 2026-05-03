'use strict';

const express = require('express');
const geoip   = require('geoip-lite');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: '64kb' }));

// ── Persistent log file ──────────────────────────────────────────────────────
// Railway mounts the /data volume here; fall back to a local file in dev.
const DATA_DIR  = process.env.DATA_DIR || '/data';
const LOG_FILE  = path.join(DATA_DIR, 'visitors.json');

// ── Feedback sync backend ────────────────────────────────────────────────────
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://ajfmoyvqevnayugxljkw.supabase.co').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FEEDBACK_READ_TOKEN = process.env.FEEDBACK_READ_TOKEN || '';
const FEEDBACK_WRITE_TOKEN = process.env.FEEDBACK_WRITE_TOKEN || '';
const FEEDBACK_COLUMNS = 'page_key,section_id,version,choice,note,updated_at';
const FEEDBACK_PAGE_KEYS = [
  'chatA', 'chatB', 'chatC', 'chatD', 'chatE', 'chatF',
  'chatG', 'chatH', 'chatJ', 'chatK', 'architecture', 'product-spec'
];

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[geo] cannot create data dir:', err.message);
  }
}

function appendVisitor(record) {
  try {
    ensureDataDir();
    // Read existing array (or start fresh), push new record, write back.
    let records = [];
    if (fs.existsSync(LOG_FILE)) {
      const raw = fs.readFileSync(LOG_FILE, 'utf8').trim();
      if (raw) records = JSON.parse(raw);
    }
    records.push(record);
    fs.writeFileSync(LOG_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    // Never let logging errors affect the response.
    console.error('[geo] failed to write visitor log:', err.message);
  }
}

function feedbackHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

function ensureSupabaseConfigured(res) {
  if (SUPABASE_SERVICE_ROLE_KEY) return true;
  res.status(503).json({ error: 'Supabase service role key is not configured' });
  return false;
}

function requireFeedbackReadToken(req, res, next) {
  const token = req.get('x-feedback-token') || '';
  const readEnabled = FEEDBACK_READ_TOKEN || FEEDBACK_WRITE_TOKEN;
  const allowed = token && (
    (FEEDBACK_READ_TOKEN && token === FEEDBACK_READ_TOKEN) ||
    (FEEDBACK_WRITE_TOKEN && token === FEEDBACK_WRITE_TOKEN)
  );
  if (!readEnabled) {
    res.status(503).json({ error: 'Feedback reads are disabled until FEEDBACK_READ_TOKEN or FEEDBACK_WRITE_TOKEN is configured' });
    return;
  }
  if (!allowed) {
    res.status(401).json({ error: 'Invalid feedback read token' });
    return;
  }
  next();
}

function requireFeedbackWriteToken(req, res, next) {
  if (!FEEDBACK_WRITE_TOKEN) {
    res.status(503).json({ error: 'Feedback writes are disabled until FEEDBACK_WRITE_TOKEN is configured' });
    return;
  }
  const token = req.get('x-feedback-token') || '';
  if (token !== FEEDBACK_WRITE_TOKEN) {
    res.status(401).json({ error: 'Invalid feedback write token' });
    return;
  }
  next();
}

function cleanString(value, maxLen) {
  return String(value || '').trim().slice(0, maxLen);
}

function normalizeFeedbackRow(body) {
  const choice = body.choice === null || body.choice === '' ? null : body.choice;
  if (choice !== null && !['a', 'd', 'x'].includes(choice)) {
    throw new Error('choice must be one of a, d, x, or null');
  }
  const row = {
    page_key: cleanString(body.page_key, 64),
    section_id: cleanString(body.section_id, 128),
    version: cleanString(body.version || '1', 32),
    choice,
    note: cleanString(body.note, 5000),
  };
  if (!row.page_key || !row.section_id || !row.version) {
    throw new Error('page_key, section_id, and version are required');
  }
  if (!FEEDBACK_PAGE_KEYS.includes(row.page_key)) {
    throw new Error('unknown page_key');
  }
  return row;
}

app.get('/api/feedback', requireFeedbackReadToken, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  try {
    const params = new URLSearchParams({ select: FEEDBACK_COLUMNS });
    if (req.query.page_key) {
      const pageKey = cleanString(req.query.page_key, 64);
      if (!FEEDBACK_PAGE_KEYS.includes(pageKey)) {
        res.status(400).json({ error: 'unknown page_key' });
        return;
      }
      params.set('page_key', `eq.${pageKey}`);
    }
    params.set('order', 'updated_at.asc');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback?${params}`, {
      headers: feedbackHeaders(),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      res.status(response.status).json({ error: payload?.message || 'Supabase fetch failed' });
      return;
    }
    res.json(payload || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', requireFeedbackWriteToken, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  let row;
  try {
    row = normalizeFeedbackRow(req.body || {});
  } catch (err) {
    res.status(400).json({ error: err.message });
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback?on_conflict=page_key,section_id,version`, {
      method: 'POST',
      headers: feedbackHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(row),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      res.status(response.status).json({ error: payload?.message || 'Supabase upsert failed' });
      return;
    }
    res.json(Array.isArray(payload) ? payload[0] || null : payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/feedback', requireFeedbackWriteToken, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  try {
    for (const pageKey of FEEDBACK_PAGE_KEYS) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback?page_key=eq.${encodeURIComponent(pageKey)}`, {
        method: 'DELETE',
        headers: feedbackHeaders({ Prefer: 'return=minimal' }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        res.status(response.status).json({ error: payload?.message || `Supabase delete failed for ${pageKey}` });
        return;
      }
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── IP geolocation middleware ────────────────────────────────────────────────
// Only fires on HTML page requests so that asset fetches (js/css/ico) don't
// generate duplicate log entries.
const HTML_RE = /\.(html?)$/i;

app.use((req, res, next) => {
  // Track index ("/") and explicit .html requests only.
  const isPage = req.path === '/' || HTML_RE.test(req.path);
  if (!isPage) return next();

  // Resolve real client IP — honour common reverse-proxy headers.
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp     = forwarded
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || '';

  // Strip IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 → 1.2.3.4).
  const ip = rawIp.replace(/^::ffff:/, '');

  const geo = geoip.lookup(ip) || {};

  const record = {
    timestamp : new Date().toISOString(),
    ip,
    country   : geo.country  || null,
    region    : geo.region   || null,
    city      : geo.city     || null,
    latitude  : geo.ll ? geo.ll[0] : null,
    longitude : geo.ll ? geo.ll[1] : null,
    path      : req.path,
    ua        : req.headers['user-agent'] || null,
  };

  console.log(
    `[geo] ${record.timestamp} | ${ip} | ` +
    `${record.country || '??'} / ${record.city || '??'} | ${req.path}`
  );

  // Fire-and-forget — do not block the response.
  setImmediate(() => appendVisitor(record));

  next();
});

// ── Static file serving ──────────────────────────────────────────────────────
// Serve site assets from the project root, but block internal project files.
app.use((req, res, next) => {
  const pathname = decodeURIComponent(req.path);
  if (/^\/(?:\.|[^/]+\.md|Dockerfile|package(?:-lock)?\.json|server\.js|docs(?:\/|$)|ai-bridge(?:\/|$)|telegram-agent-bridge(?:\/|$)|scripts(?:\/|$)|node_modules(?:\/|$)|data(?:\/|$))/i.test(pathname)) {
    res.status(404).send('Not found');
    return;
  }
  next();
});
app.use(express.static(path.join(__dirname), {
  index : 'index.html',
  etag  : true,
}));

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send('Not found');
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
  ensureDataDir();
  console.log(`[server] visitor log → ${LOG_FILE}`);
});
