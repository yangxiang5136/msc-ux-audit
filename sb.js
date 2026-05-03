/*
 * MSC.AI Feedback Client
 * - Talks to the same-origin /api/feedback proxy in server.js
 * - Does not expose Supabase credentials in the browser
 * - Preserves the old MSC_SB interface used by fb.js and decisions.html
 */

const WRITE_TOKEN_KEY = 'msc_feedback_write_token'
const POLL_MS = 5000

const listeners = new Set()
let pollTimer = null
let lastSnapshot = ''

function getWriteToken() {
  try { return localStorage.getItem(WRITE_TOKEN_KEY) || '' }
  catch(e) { return '' }
}

function setWriteToken(token) {
  try {
    if (token) localStorage.setItem(WRITE_TOKEN_KEY, token)
    else localStorage.removeItem(WRITE_TOKEN_KEY)
  } catch(e) {}
}

async function requestJson(url, options) {
  const res = await fetch(url, options)
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data && data.error ? data.error : `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    throw err
  }
  return data
}

function pageParam(pageKey) {
  return pageKey ? `?page_key=${encodeURIComponent(pageKey)}` : ''
}

function readHeaders() {
  const headers = {}
  const token = getWriteToken()
  if (token) headers['x-feedback-token'] = token
  return headers
}

function isDecisionsPage() {
  try { return /(?:^|\/)decisions\.html$/i.test(window.location.pathname) }
  catch(e) { return false }
}

// Fetch feedback rows (optionally filtered by page_key)
async function fetchAll(pageKey) {
  async function run() {
    return requestJson('/api/feedback' + pageParam(pageKey), {
      headers: readHeaders()
    })
  }

  try {
    return await run()
  } catch(e) {
    if (e.status === 401) {
      const hadToken = !!getWriteToken()
      if (hadToken) setWriteToken('')
      if (hadToken || isDecisionsPage()) {
        try { return await promptForTokenAndRetry(run) || [] } catch(retryErr) { e = retryErr }
      }
    }
    console.warn('[SB] fetch error:', e.message)
    return []
  }
}

function writeHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = getWriteToken()
  if (token) headers['x-feedback-token'] = token
  return headers
}

async function promptForTokenAndRetry(fn) {
  if (typeof window.prompt !== 'function') return null
  const token = window.prompt('请输入反馈访问/写入令牌')
  if (!token) return null
  setWriteToken(token.trim())
  return fn()
}

// Upsert a single feedback row
async function upsert(pageKey, sectionId, version, choice, note) {
  const row = {
    page_key: pageKey,
    section_id: sectionId,
    version: version,
    choice: choice,
    note: note || ''
  }

  async function run() {
    return requestJson('/api/feedback', {
      method: 'POST',
      headers: writeHeaders(),
      body: JSON.stringify(row)
    })
  }

  try {
    return await run()
  } catch(e) {
    if (e.status === 401) {
      setWriteToken('')
      try { return await promptForTokenAndRetry(run) } catch(retryErr) { e = retryErr }
    }
    console.warn('[SB] upsert error:', e.message)
    return null
  }
}

async function clearAll() {
  async function run() {
    await requestJson('/api/feedback', {
      method: 'DELETE',
      headers: writeHeaders()
    })
    return true
  }

  try {
    return await run()
  } catch(e) {
    if (e.status === 401) {
      setWriteToken('')
      try { return await promptForTokenAndRetry(run) } catch(retryErr) { e = retryErr }
    }
    console.warn('[SB] clear error:', e.message)
    return false
  }
}

function rowKey(row) {
  return [row.page_key, row.section_id, row.version].join('::')
}

function snapshotRows(rows) {
  return rows
    .map(r => `${rowKey(r)}::${r.choice || ''}::${r.note || ''}::${r.updated_at || ''}`)
    .sort()
    .join('|')
}

async function poll() {
  if (listeners.size === 0) return
  const rows = await fetchAll()
  const nextSnapshot = snapshotRows(rows)
  if (lastSnapshot && nextSnapshot !== lastSnapshot) {
    rows.forEach(row => {
      listeners.forEach(cb => {
        try { cb({ event: 'poll', eventType: 'UPDATE', new: row }) }
        catch(e) { console.warn('[SB] listener error:', e) }
      })
    })
  }
  lastSnapshot = nextSnapshot
}

// Subscribe to changes using lightweight polling; returns unsubscribe fn
function subscribe(callback) {
  listeners.add(callback)
  if (!pollTimer) {
    poll().catch(e => console.warn('[SB] initial poll error:', e.message))
    pollTimer = setInterval(() => {
      poll().catch(e => console.warn('[SB] poll error:', e.message))
    }, POLL_MS)
  }
  return () => {
    listeners.delete(callback)
    if (listeners.size === 0 && pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
      lastSnapshot = ''
    }
  }
}

// Convert rows into the v2 nested format used by localStorage/fb.js
function toNested(rows) {
  const out = {}
  rows.forEach(r => {
    if (!out[r.page_key]) out[r.page_key] = { _v: 2 }
    if (!out[r.page_key][r.section_id]) out[r.page_key][r.section_id] = {}
    out[r.page_key][r.section_id][r.version] = {
      c: r.choice,
      n: r.note || '',
      t: r.updated_at
    }
  })
  return out
}

window.MSC_SB = { fetchAll, upsert, clearAll, subscribe, toNested, setWriteToken, getWriteToken, client: null }
window.dispatchEvent(new Event('msc-sb-ready'))
console.log('[SB] ready')
