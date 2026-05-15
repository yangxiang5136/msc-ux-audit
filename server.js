'use strict';

const express = require('express');
const geoip   = require('geoip-lite');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 8080;

// body limit · 提升到 8mb 接收 wxapp 截图 (base64 编码后, 3MB 原图约 4MB)
app.use(express.json({ limit: '8mb' }));

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

// ── /wxapp/ 模块：角色 token 配置 ─────────────────────────────────────────────
// 每个角色独立 token，写入时自动注入 author_role。
// 部署时在 Railway → Variables 配置 WXAPP_TOKEN_SEAN/UIUX/ENG/CEO。
const WXAPP_TOKENS = {
  sean: process.env.WXAPP_TOKEN_SEAN || '',
  uiux: process.env.WXAPP_TOKEN_UIUX || '',
  eng:  process.env.WXAPP_TOKEN_ENG  || '',
  ceo:  process.env.WXAPP_TOKEN_CEO  || '',
};
const WXAPP_STATUSES = ['draft', 'review', 'accepted', 'rejected', 'shipped'];
const WXAPP_DEVICE_TARGETS = ['ios', 'android', 'both'];
const WXAPP_COMMENT_KINDS = ['note', 'approve', 'reject', 'block', 'idea'];
const WXAPP_ANNOTATION_SHAPES = ['freehand', 'circle', 'arrow', 'rect', 'none'];
const WXAPP_REACTIONS = ['approve', 'reject', 'block', 'idea', 'note'];
const WXAPP_SCREENSHOT_MAX_BYTES = 4 * 1024 * 1024;  // 4MB base64 (~3MB 原图) · iPhone Pro Max 截图也能装下
const WXAPP_SCREENSHOT_DATA_URI_RE = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i;

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

// ── /api/wxapp/* 微信小程序改稿协作模块 ──────────────────────────────────────
const WXAPP_COOKIE_NAME = 'wxapp_session';
const WXAPP_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (k) {
        try { out[k] = decodeURIComponent(v); }
        catch { out[k] = v; }
      }
    }
  });
  return out;
}

function setWxappSessionCookie(req, res, token) {
  const isHttps = req.secure || (req.headers['x-forwarded-proto'] || '').includes('https');
  const parts = [
    `${WXAPP_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${WXAPP_COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (isHttps) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearWxappSessionCookie(req, res) {
  const isHttps = req.secure || (req.headers['x-forwarded-proto'] || '').includes('https');
  const parts = [
    `${WXAPP_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (isHttps) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function resolveWxappRole(token) {
  if (!token) return null;
  for (const [role, value] of Object.entries(WXAPP_TOKENS)) {
    if (value && token === value) return role;
  }
  return null;
}

function extractWxappToken(req) {
  // 1. 优先 cookie (浏览器自动带)
  const cookies = parseCookies(req);
  if (cookies[WXAPP_COOKIE_NAME]) return cookies[WXAPP_COOKIE_NAME];
  // 2. fallback: x-wxapp-token header (适合 curl 测试 / 备用)
  return req.get('x-wxapp-token') || '';
}

function requireWxappRole(req, res, next) {
  const token = extractWxappToken(req);
  const role = resolveWxappRole(token);
  if (!role) {
    res.status(401).json({ error: 'Invalid or missing wxapp session' });
    return;
  }
  req.wxappRole = role;
  next();
}

// ── 登录 / 登出 ─────────────────────────────────────────────────────────
app.post('/api/wxapp/login', (req, res) => {
  const body = req.body || {};
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const role = resolveWxappRole(token);
  if (!role) {
    res.status(401).json({ error: 'token 无效或未在 Railway 配置' });
    return;
  }
  setWxappSessionCookie(req, res, token);
  res.json({ role });
});

app.post('/api/wxapp/logout', (req, res) => {
  clearWxappSessionCookie(req, res);
  res.status(204).end();
});

async function fetchProposalBySlug(slug) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/wxapp_proposal?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers: feedbackHeaders() }
  );
  const arr = await res.json().catch(() => []);
  if (!res.ok || !Array.isArray(arr) || arr.length === 0) return null;
  return arr[0];
}

app.get('/api/wxapp/whoami', requireWxappRole, (req, res) => {
  res.json({ role: req.wxappRole });
});

app.get('/api/wxapp/proposals', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  try {
    const params = new URLSearchParams({ select: '*', order: 'updated_at.desc' });
    if (req.query.status && WXAPP_STATUSES.includes(req.query.status)) {
      params.set('status', `eq.${req.query.status}`);
    }
    if (req.query.flow_group) {
      params.set('flow_group', `eq.${cleanString(req.query.flow_group, 64)}`);
    }
    if (req.query.author_role && Object.keys(WXAPP_TOKENS).includes(req.query.author_role)) {
      params.set('author_role', `eq.${req.query.author_role}`);
    }
    const response = await fetch(`${SUPABASE_URL}/rest/v1/wxapp_proposal?${params}`, {
      headers: feedbackHeaders(),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      res.status(response.status).json({ error: payload?.message || 'list failed' });
      return;
    }
    res.json(payload || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wxapp/proposals/:slug', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  const slug = cleanString(req.params.slug, 128);
  try {
    const proposal = await fetchProposalBySlug(slug);
    if (!proposal) { res.status(404).json({ error: 'proposal not found' }); return; }

    const [revRes, cmRes, anRes, scRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/wxapp_proposal_revision?proposal_id=eq.${proposal.id}&select=*&order=created_at.desc`, { headers: feedbackHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/wxapp_comment?proposal_id=eq.${proposal.id}&select=*&order=created_at.asc`, { headers: feedbackHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/wxapp_annotation?proposal_id=eq.${proposal.id}&select=*&order=created_at.asc`, { headers: feedbackHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/wxapp_screenshot?proposal_id=eq.${proposal.id}&select=id,caption,author_role,byte_size,mime_type,data_uri,created_at&order=created_at.desc`, { headers: feedbackHeaders() }),
    ]);
    const [revisions, comments, annotations, screenshots] = await Promise.all([
      revRes.json().catch(() => []),
      cmRes.json().catch(() => []),
      anRes.json().catch(() => []),
      scRes.json().catch(() => []),
    ]);
    res.json({ proposal, revisions, comments, annotations, screenshots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wxapp/proposals', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  const body = req.body || {};
  const row = {
    slug:               cleanString(body.slug, 128),
    title:              cleanString(body.title, 256),
    screen_name:        cleanString(body.screen_name, 128) || null,
    flow_group:         cleanString(body.flow_group, 64) || null,
    status:             WXAPP_STATUSES.includes(body.status) ? body.status : 'draft',
    device_target:      WXAPP_DEVICE_TARGETS.includes(body.device_target) ? body.device_target : 'both',
    original_image_url: cleanString(body.original_image_url, 2048) || null,
    redesign_html:      String(body.redesign_html || '').slice(0, 50000),
    redesign_css:       String(body.redesign_css || '').slice(0, 20000),
    rationale:          String(body.rationale || '').slice(0, 20000),
    author_role:        req.wxappRole,
  };
  if (!row.slug || !row.title) {
    res.status(400).json({ error: 'slug and title are required' });
    return;
  }
  // slug 简单合法性检查（防止 /a/b 路径注入）
  if (!/^[a-z0-9][a-z0-9-_]{0,127}$/i.test(row.slug)) {
    res.status(400).json({ error: 'slug must match [a-z0-9][a-z0-9-_]*' });
    return;
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/wxapp_proposal`, {
      method: 'POST',
      headers: feedbackHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(row),
    });
    const p = await r.json().catch(() => null);
    if (!r.ok) {
      res.status(r.status).json({ error: p?.message || 'create failed' });
      return;
    }
    res.json(Array.isArray(p) ? p[0] : p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/wxapp/proposals/:slug', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  const slug = cleanString(req.params.slug, 128);
  const body = req.body || {};
  try {
    const proposal = await fetchProposalBySlug(slug);
    if (!proposal) { res.status(404).json({ error: 'proposal not found' }); return; }

    // 若改稿正文/CSS/rationale 有变 → 先把旧版本快照到 revision
    const contentChanged =
      (body.redesign_html !== undefined && body.redesign_html !== proposal.redesign_html) ||
      (body.redesign_css  !== undefined && body.redesign_css  !== proposal.redesign_css)  ||
      (body.rationale     !== undefined && body.rationale     !== proposal.rationale);
    if (contentChanged) {
      await fetch(`${SUPABASE_URL}/rest/v1/wxapp_proposal_revision`, {
        method: 'POST',
        headers: feedbackHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify({
          proposal_id:   proposal.id,
          redesign_html: proposal.redesign_html,
          redesign_css:  proposal.redesign_css,
          rationale:     proposal.rationale,
          author_role:   proposal.author_role,
        }),
      }).catch(err => console.warn('[wxapp] revision snapshot failed:', err.message));
    }

    const patch = { updated_at: new Date().toISOString(), author_role: req.wxappRole };
    const fields = ['title','screen_name','flow_group','status','device_target','original_image_url','redesign_html','redesign_css','rationale'];
    for (const k of fields) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    if (patch.status && !WXAPP_STATUSES.includes(patch.status)) {
      res.status(400).json({ error: 'invalid status' });
      return;
    }
    if (patch.device_target && !WXAPP_DEVICE_TARGETS.includes(patch.device_target)) {
      res.status(400).json({ error: 'invalid device_target' });
      return;
    }
    if (typeof patch.redesign_html === 'string') patch.redesign_html = patch.redesign_html.slice(0, 50000);
    if (typeof patch.redesign_css  === 'string') patch.redesign_css  = patch.redesign_css.slice(0, 20000);
    if (typeof patch.rationale     === 'string') patch.rationale     = patch.rationale.slice(0, 20000);

    const r = await fetch(`${SUPABASE_URL}/rest/v1/wxapp_proposal?id=eq.${proposal.id}`, {
      method: 'PATCH',
      headers: feedbackHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(patch),
    });
    const p = await r.json().catch(() => null);
    if (!r.ok) {
      res.status(r.status).json({ error: p?.message || 'update failed' });
      return;
    }
    res.json(Array.isArray(p) ? p[0] : p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wxapp/proposals/:slug/comments', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  const slug = cleanString(req.params.slug, 128);
  const body = req.body || {};
  try {
    const proposal = await fetchProposalBySlug(slug);
    if (!proposal) { res.status(404).json({ error: 'proposal not found' }); return; }
    const row = {
      proposal_id:   proposal.id,
      annotation_id: typeof body.annotation_id === 'string' && body.annotation_id ? body.annotation_id : null,
      author_role:   req.wxappRole,
      kind:          WXAPP_COMMENT_KINDS.includes(body.kind) ? body.kind : 'note',
      body:          cleanString(body.body, 5000),
      section:       cleanString(body.section, 64) || '',
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/wxapp_comment`, {
      method: 'POST',
      headers: feedbackHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(row),
    });
    const p = await r.json().catch(() => null);
    if (!r.ok) {
      res.status(r.status).json({ error: p?.message || 'comment failed' });
      return;
    }
    res.json(Array.isArray(p) ? p[0] : p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wxapp/proposals/:slug/annotations', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  const slug = cleanString(req.params.slug, 128);
  const body = req.body || {};
  try {
    const proposal = await fetchProposalBySlug(slug);
    if (!proposal) { res.status(404).json({ error: 'proposal not found' }); return; }
    const row = {
      proposal_id:     proposal.id,
      author_role:     req.wxappRole,
      shape:           WXAPP_ANNOTATION_SHAPES.includes(body.shape) ? body.shape : 'none',
      svg_path:        cleanString(body.svg_path, 20000) || null,
      target_selector: cleanString(body.target_selector, 256) || null,
      device:          ['ios','android'].includes(body.device) ? body.device : 'ios',
      anchor_x:        typeof body.anchor_x === 'number' ? body.anchor_x : null,
      anchor_y:        typeof body.anchor_y === 'number' ? body.anchor_y : null,
      comment:         cleanString(body.comment, 5000),
      reaction:        null,                                // v2: 表态从 annotation 移到 comment
      status:          WXAPP_STATUSES.includes(body.status) ? body.status : 'draft',
      transform_data:  body.transform_data && typeof body.transform_data === 'object' ? body.transform_data : {},
      section:         cleanString(body.section, 64) || '',
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/wxapp_annotation`, {
      method: 'POST',
      headers: feedbackHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(row),
    });
    const p = await r.json().catch(() => null);
    if (!r.ok) {
      res.status(r.status).json({ error: p?.message || 'annotation failed' });
      return;
    }
    res.json(Array.isArray(p) ? p[0] : p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// v2: PATCH annotation · 更新 status / transform_data / comment 文本
app.patch('/api/wxapp/proposals/:slug/annotations/:id', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  const id = cleanString(req.params.id, 64);
  const body = req.body || {};
  const patch = {};
  if (body.status !== undefined) {
    if (!WXAPP_STATUSES.includes(body.status)) {
      res.status(400).json({ error: 'invalid status' });
      return;
    }
    patch.status = body.status;
  }
  if (body.transform_data !== undefined && typeof body.transform_data === 'object') {
    patch.transform_data = body.transform_data;
  }
  if (body.comment !== undefined) {
    patch.comment = String(body.comment).slice(0, 5000);
  }
  if (body.svg_path !== undefined) {
    patch.svg_path = String(body.svg_path).slice(0, 20000);
  }
  if (body.anchor_x !== undefined && typeof body.anchor_x === 'number') patch.anchor_x = body.anchor_x;
  if (body.anchor_y !== undefined && typeof body.anchor_y === 'number') patch.anchor_y = body.anchor_y;
  if (body.section !== undefined) patch.section = cleanString(body.section, 64);
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'no patch fields' });
    return;
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/wxapp_annotation?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: feedbackHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(patch),
    });
    const p = await r.json().catch(() => null);
    if (!r.ok) {
      res.status(r.status).json({ error: p?.message || 'annotation patch failed' });
      return;
    }
    res.json(Array.isArray(p) ? p[0] : p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/wxapp/proposals/:slug/annotations/:id', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  const id = cleanString(req.params.id, 64);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/wxapp_annotation?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: feedbackHeaders({ Prefer: 'return=minimal' }),
    });
    if (!r.ok) {
      const p = await r.json().catch(() => null);
      res.status(r.status).json({ error: p?.message || 'delete failed' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// v2: screenshot 上传 / 列表 / 删除 ───────────────────────────────────────
app.post('/api/wxapp/proposals/:slug/screenshots', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  const slug = cleanString(req.params.slug, 128);
  const body = req.body || {};
  const dataUri = String(body.data_uri || '');
  if (!WXAPP_SCREENSHOT_DATA_URI_RE.test(dataUri)) {
    res.status(400).json({ error: 'data_uri must be data:image/<png|jpeg|jpg|gif|webp>;base64,...' });
    return;
  }
  const base64Body = dataUri.split(',')[1] || '';
  const byteSize = Math.floor(base64Body.length * 0.75);  // 估算解码后字节数
  if (byteSize > WXAPP_SCREENSHOT_MAX_BYTES) {
    const mb = (byteSize / 1024 / 1024).toFixed(1);
    const max = (WXAPP_SCREENSHOT_MAX_BYTES / 1024 / 1024).toFixed(0);
    res.status(400).json({ error: `screenshot 过大: ${mb}MB > ${max}MB 上限。请压缩或裁剪后重试。` });
    return;
  }
  try {
    const proposal = await fetchProposalBySlug(slug);
    if (!proposal) { res.status(404).json({ error: 'proposal not found' }); return; }
    const mimeMatch = dataUri.match(/^data:(image\/[a-z]+);base64,/i);
    const row = {
      proposal_id: proposal.id,
      data_uri:    dataUri,
      mime_type:   mimeMatch ? mimeMatch[1].toLowerCase() : 'image/png',
      caption:     cleanString(body.caption, 200) || null,
      author_role: req.wxappRole,
      byte_size:   byteSize,
      section:     cleanString(body.section, 64) || '',
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/wxapp_screenshot`, {
      method: 'POST',
      headers: feedbackHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(row),
    });
    const p = await r.json().catch(() => null);
    if (!r.ok) {
      res.status(r.status).json({ error: p?.message || 'screenshot upload failed' });
      return;
    }
    res.json(Array.isArray(p) ? p[0] : p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/wxapp/proposals/:slug/screenshots/:id', requireWxappRole, async (req, res) => {
  if (!ensureSupabaseConfigured(res)) return;
  const id = cleanString(req.params.id, 64);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/wxapp_screenshot?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: feedbackHeaders({ Prefer: 'return=minimal' }),
    });
    if (!r.ok) {
      const p = await r.json().catch(() => null);
      res.status(r.status).json({ error: p?.message || 'screenshot delete failed' });
      return;
    }
    res.status(204).end();
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
  if (/^\/(?:\.|[^/]+\.md|Dockerfile|package(?:-lock)?\.json|server\.js|docs(?:\/|$)|feedback-archive(?:\/|$)|ai-bridge(?:\/|$)|telegram-agent-bridge(?:\/|$)|scripts(?:\/|$)|migrations(?:\/|$)|node_modules(?:\/|$)|data(?:\/|$))/i.test(pathname)) {
    res.status(404).send('Not found');
    return;
  }
  next();
});

// ── /wxapp/ 页面守卫 ────────────────────────────────────────────────────────
// 没有有效 session cookie 时, /wxapp.html 和 /wxapp-detail.html 一律 404,
// 让外人完全察觉不到沙箱存在。/wxapp-login.html 永远公开 (这是唯一入口)。
// /wxapp.js 和 /wxapp.css 也保持公开因为登录页需要它们。
app.use((req, res, next) => {
  const pathname = decodeURIComponent(req.path);
  if (/^\/wxapp(?:-detail)?\.html$/i.test(pathname)) {
    const token = extractWxappToken(req);
    if (!resolveWxappRole(token)) {
      res.status(404).send('Not found');
      return;
    }
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
