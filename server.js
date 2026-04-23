'use strict';

const express = require('express');
const geoip   = require('geoip-lite');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 8080;

// ── Persistent log file ──────────────────────────────────────────────────────
// Railway mounts the /data volume here; fall back to a local file in dev.
const DATA_DIR  = process.env.DATA_DIR || '/data';
const LOG_FILE  = path.join(DATA_DIR, 'visitors.json');

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
// Serve everything in the project root (html, js, docs/, etc.).
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
