/*
 * MSC.AI Supabase Client
 * - Wraps supabase-js v2 with feedback-specific helpers
 * - Exposes window.MSC_SB (Promise that resolves to client)
 * - Graceful degradation: if CDN blocked or Supabase down, fb.js falls back to localStorage
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = 'https://ajfmoyvqevnayugxljkw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZm1veXZxZXZuYXl1Z3hsamt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTk4NzcsImV4cCI6MjA5MTg3NTg3N30.-qbxexQ6Xmf9AHicPo6Kl1IsqFMn87ruk-ssQ38SW9c'

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
})

const listeners = new Set()
let channel = null

// Fetch feedback rows (optionally filtered by page_key)
async function fetchAll(pageKey) {
  let query = client.from('feedback').select('page_key,section_id,version,choice,note,updated_at')
  if (pageKey) query = query.eq('page_key', pageKey)
  const { data, error } = await query
  if (error) { console.warn('[SB] fetch error:', error.message); return []; }
  return data || []
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
  const { data, error } = await client
    .from('feedback')
    .upsert(row, { onConflict: 'page_key,section_id,version' })
    .select()
  if (error) { console.warn('[SB] upsert error:', error.message); return null; }
  return data && data[0]
}

// Subscribe to realtime changes; returns unsubscribe fn
function subscribe(callback) {
  listeners.add(callback)
  if (!channel) {
    channel = client
      .channel('feedback-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'feedback' },
        payload => listeners.forEach(cb => {
          try { cb(payload) } catch(e) { console.warn('[SB] listener error:', e) }
        })
      )
      .subscribe(status => {
        console.log('[SB] channel status:', status)
      })
  }
  return () => {
    listeners.delete(callback)
    if (listeners.size === 0 && channel) {
      client.removeChannel(channel)
      channel = null
    }
  }
}

// Convert Supabase rows into the v2 nested format used by localStorage/fb.js
// Input: array of { page_key, section_id, version, choice, note, updated_at }
// Output: { [pageKey]: { [sectionId]: { [version]: { c, n, t } } } }
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

window.MSC_SB = { fetchAll, upsert, subscribe, toNested, client }
window.dispatchEvent(new Event('msc-sb-ready'))
console.log('[SB] ready')
