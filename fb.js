/*
 * MSC.AI Feedback System v2 — Version-aware
 *
 * Also includes shared UI utility functions (tog, toggle, toggleAll, etc.)
 * that were previously inline in each page's <script> block.
 *
 * v7.4.1: added safety stubs for legacy onclick handlers (sel, sf, onChoice)
 *         and chatD mockup handlers (openRedPkt, resetSlide, startCountdown)
 *         so that missing function errors can't break the page.
 */

// ═══ Shared UI Utilities ═══
// Card expand/collapse — robust version that handles both CSS patterns
// and arbitrary initial states (some pages render with some cards pre-open):
//   Pattern A (chatE/F/G/H): expects .card-head.open + .card-body.show
//   Pattern B (chatB/C/D):   expects .card.open (then CSS: .card.open .card-body{display:block})
//
// Strategy: detect current "is open" state from ANY of the three indicators,
// then set ALL three consistently (fully open or fully closed). This works
// regardless of which pattern the page uses and heals inconsistent initial HTML.
// v7.4.8: Added support for a third pattern — .cflow (architecture.html) which
// uses `.cflow.open` as the container toggle (similar to Pattern B but with
// different class name).
function _setCardState(head, isOpen) {
  if (!head) return;
  var body = head.nextElementSibling;
  // container could be .card (Pattern B) or .cflow (architecture)
  var container = head.closest('.card') || head.closest('.cflow');
  if (isOpen) {
    head.classList.add('open');
    if (body) body.classList.add('show');
    if (container && container !== head) container.classList.add('open');
  } else {
    head.classList.remove('open');
    if (body) body.classList.remove('show');
    if (container && container !== head) container.classList.remove('open');
  }
}
function _isCardOpen(head) {
  if (!head) return false;
  var body = head.nextElementSibling;
  var container = head.closest('.card') || head.closest('.cflow');
  return head.classList.contains('open') ||
         (body && body.classList.contains('show')) ||
         (container && container !== head && container.classList.contains('open'));
}

function tog(el) {
  if (!el) return;
  _setCardState(el, !_isCardOpen(el));
}
function toggle(el) {
  if (!el) return;
  _setCardState(el, !_isCardOpen(el));
}
function toggleCeo(el) {
  if (!el) return;
  _setCardState(el, !_isCardOpen(el));
}

// Expand/collapse ALL cards on page (chatE, F)
function toggleAll(expand) {
  document.querySelectorAll('.card-head').forEach(function(h) {
    _setCardState(h, !!expand);
  });
}

// Nav item active state (chatA)
function setActive(el) {
  if (!el) return;
  var parent = el.closest('.nav-bar, .nav');
  if (parent) {
    parent.querySelectorAll('.nav-item, a').forEach(function(a) {
      a.classList.remove('active');
    });
  }
  el.classList.add('active');
}

// ═══ Legacy safety stubs (v7.4.1) ═══
// These were previously referenced in HTML onclick= but fb.js renderFB()
// rewrites the feedback block innerHTML on init, so the onclicks never fire.
// However, if fb.js init hasn't run yet (or failed), the browser would throw
// "sel is not defined" on first click and potentially break other handlers.
// Define safe no-ops that just wait for fb.js to re-bind properly.
if (typeof window.sel === 'undefined') {
  window.sel = function(){ /* fb.js renderFB will rebind */ };
}
if (typeof window.sf === 'undefined') {
  window.sf = function(){ /* fb.js renderFB will rebind */ };
}
if (typeof window.onChoice === 'undefined') {
  window.onChoice = function(){ /* fb.js renderFB will rebind */ };
}
// chatD mockup interactions — if the original inline script that defined these
// was stripped, the onclicks would throw. Provide safe no-ops.
if (typeof window.openRedPkt === 'undefined') {
  window.openRedPkt = function(){
    var el = document.getElementById('redpkt');
    if (el) el.style.transform = 'scale(0.9)';
  };
}
if (typeof window.resetSlide === 'undefined') {
  window.resetSlide = function(id){
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  };
}
if (typeof window.startCountdown === 'undefined') {
  window.startCountdown = function(){
    // Safe no-op — original countdown logic was inline in chatD
    var btn = document.getElementById('withdraw-btn');
    if (btn) btn.textContent = '确认提现';
  };
}

/*
 *   localStorage[FB_KEY] = {
 *     "e8.1": {
 *       "6":   { c: "a", n: "note", t: "2026-04-09T10:00:00Z" },
 *       "6.1": { c: "d", n: "discuss", t: "..." },
 *       "6.2": { c: "a", n: "", t: "..." }
 *     },
 *     ...
 *   }
 *
 * HTML contract:
 *   <div class="fb" data-id="e8.1" data-ver="6.2" data-changelog="(optional)">
 *
 * Page contract:
 *   <script>window.FB_KEY='msc_e_fb'; window.FB_PAGE='chatE'</script>
 *   <script src="/fb.js"></script>
 */
(function(){
  var KEY = window.FB_KEY;
  var PAGE = window.FB_PAGE;
  if (!KEY) { console.warn('fb.js: window.FB_KEY not set'); return; }

  var CHOICE_LABELS = { a: '✓ 同意', d: '💬 需讨论', x: '✗ 不同意' };
  var CHOICE_SHORT = { a: '✓同意', d: '💬讨论', x: '✗不同意' };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch(e) { return {}; }
  }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

  // Parse version string "6.2" → [6, 2]; "6" → [6, 0]
  function parseVer(v) {
    v = String(v || '1');
    return v.split('.').map(function(n){ return parseInt(n, 10) || 0; });
  }
  // Compare versions a vs b: returns -1, 0, or 1
  function compareVer(a, b) {
    var pa = parseVer(a), pb = parseVer(b);
    var len = Math.max(pa.length, pb.length);
    for (var i = 0; i < len; i++) {
      var x = pa[i] || 0, y = pb[i] || 0;
      if (x < y) return -1;
      if (x > y) return 1;
    }
    return 0;
  }

  // Migrate old flat format to new nested format
  // Old: { "e8.1.v6": {c,n}, "e1.1": {c,n} }
  // New: { "e8.1": {"6":{c,n,t}}, "e1.1": {"1":{c,n,t}} }
  function migrate() {
    var data = load();
    if (data._v === 2) return data;
    var migrated = { _v: 2 };
    Object.keys(data).forEach(function(k){
      if (k === '_v') return;
      var val = data[k];
      if (!val || typeof val !== 'object') return;
      // Check if already in new format (nested with version keys)
      var keys = Object.keys(val);
      var looksNew = keys.length > 0 && keys.every(function(vk){
        return /^\d+(\.\d+)*$/.test(vk) && val[vk] && typeof val[vk] === 'object';
      });
      if (looksNew) {
        migrated[k] = val;
        return;
      }
      // Old format: extract id and version from key
      var m = k.match(/^(.+)\.v(\d+(?:\.\d+)*)$/);
      var id, ver;
      if (m) { id = m[1]; ver = m[2]; }
      else   { id = k; ver = '1'; }
      if (!migrated[id]) migrated[id] = {};
      migrated[id][ver] = {
        c: val.c || null,
        n: val.n || '',
        t: val.t || new Date().toISOString()
      };
    });
    save(migrated);
    return migrated;
  }

  function getFB(data, id, ver) {
    if (!data[id] || !data[id][ver]) return null;
    return data[id][ver];
  }

  // Return all feedback for this id, sorted descending by version (newest first)
  function getAllVersions(data, id) {
    if (!data[id]) return [];
    return Object.keys(data[id])
      .filter(function(v){ return data[id][v] && (data[id][v].c || data[id][v].n); })
      .sort(function(a,b){ return compareVer(b, a); });
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    } catch(e) { return ''; }
  }

  function renderFB(fbEl, data) {
    var id = fbEl.dataset.id;
    var ver = fbEl.dataset.ver || '1';
    var changelog = fbEl.dataset.changelog || '';
    var desc = fbEl.dataset.desc || fbEl.getAttribute('data-desc') || '';
    // If no data-desc, keep whatever's already in .fb-d
    var descEl = fbEl.querySelector('.fb-d');
    if (descEl && desc) descEl.textContent = desc;

    var current = getFB(data, id, ver);
    var allVers = getAllVersions(data, id);
    var olderVers = allVers.filter(function(v){ return compareVer(v, ver) < 0; });
    var hasOlderFeedback = olderVers.length > 0;
    var currentHasFeedback = current && (current.c || current.n);

    // Ensure structure: [label + version badge] [optional warn banner] [desc] [buttons] [textarea] [history]
    // Rebuild inner HTML to ensure consistency
    var labelHtml = '<div class="fb-head">' +
      '<span class="fb-l">CEO 快速反馈</span>' +
      '<span class="fb-ver" data-state="' + (hasOlderFeedback && !currentHasFeedback ? 'updated' : 'current') + '">v' + ver +
        (current && current.t ? ' · ' + formatDate(current.t) : (hasOlderFeedback && !currentHasFeedback ? ' · 新版本' : '')) +
      '</span>' +
      '</div>';

    var warnHtml = '';
    if (hasOlderFeedback && !currentHasFeedback) {
      var prevVer = olderVers[0];
      warnHtml = '<div class="fb-warn">⚡ 内容已从 v' + prevVer + ' 更新至 v' + ver +
        (changelog ? ' · ' + changelog : '') +
        '，请重新确认</div>';
    } else if (changelog && !currentHasFeedback) {
      warnHtml = '<div class="fb-warn">⚡ ' + changelog + '</div>';
    }

    var existingDesc = descEl ? descEl.textContent : (fbEl.dataset.desc || '');
    var descHtml = existingDesc ? '<div class="fb-d">' + escapeHtml(existingDesc) + '</div>' : '';

    var c = current ? current.c : null;
    var btnHtml = '<div class="fb-row">' +
      '<button class="fb-b ' + (c==='a'?'s-a':'') + '" data-c="a">✓ 同意</button>' +
      '<button class="fb-b ' + (c==='d'?'s-d':'') + '" data-c="d">💬 需讨论</button>' +
      '<button class="fb-b ' + (c==='x'?'s-x':'') + '" data-c="x">✗ 不同意</button>' +
      '</div>';

    var noteVal = current ? (current.n || '') : '';
    var noteHtml = '<textarea class="fb-n" placeholder="备注...">' + escapeHtml(noteVal) + '</textarea>';

    var histHtml = '';
    if (olderVers.length > 0) {
      histHtml = '<details class="fb-hist"><summary class="fb-hist-head">▸ 历史反馈 · ' + olderVers.length + '条</summary><div class="fb-hist-items">';
      olderVers.forEach(function(v){
        var fb = data[id][v];
        var cls = fb.c ? 'h-' + fb.c : 'h-n';
        histHtml += '<div class="fb-hist-item">' +
          '<span class="fb-hist-v">v' + v + '</span>' +
          (fb.c ? '<span class="fb-hist-c ' + cls + '">' + CHOICE_SHORT[fb.c] + '</span>' : '') +
          '<span class="fb-hist-n">' + (fb.n ? '"' + escapeHtml(fb.n) + '"' : '<em style="opacity:.5">无备注</em>') +
            (fb.t ? ' · ' + formatDate(fb.t) : '') + '</span>' +
          '</div>';
      });
      histHtml += '</div></details>';
    }

    fbEl.innerHTML = labelHtml + warnHtml + descHtml + btnHtml + noteHtml + histHtml;

    // Wire up listeners
    fbEl.querySelectorAll('.fb-b').forEach(function(btn){
      btn.addEventListener('click', function(){
        onVote(fbEl, btn.dataset.c);
      });
    });
    var ta = fbEl.querySelector('.fb-n');
    if (ta) {
      ta.addEventListener('blur', function(){ onNote(fbEl, ta.value); });
    }
  }

  function onVote(fbEl, choice) {
    var id = fbEl.dataset.id;
    var ver = fbEl.dataset.ver || '1';
    var data = load();
    if (!data[id]) data[id] = {};
    var existing = data[id][ver] || {};
    existing.c = choice;
    existing.t = new Date().toISOString();
    if (!existing.n) existing.n = '';
    data[id][ver] = existing;
    save(data);
    renderFB(fbEl, data);
    updateStats(data);
    // Push to Supabase (non-blocking, fires and forgets)
    if (window.MSC_SB) {
      window.MSC_SB.upsert(PAGE, id, ver, choice, existing.n);
    }
  }

  function onNote(fbEl, note) {
    var id = fbEl.dataset.id;
    var ver = fbEl.dataset.ver || '1';
    var data = load();
    if (!data[id]) data[id] = {};
    var existing = data[id][ver] || {};
    existing.n = note;
    existing.t = new Date().toISOString();
    if (!existing.c) existing.c = null;
    data[id][ver] = existing;
    save(data);
    updateStats(data);
    if (window.MSC_SB) {
      window.MSC_SB.upsert(PAGE, id, ver, existing.c, note);
    }
  }

  function updateStats(data) {
    data = data || load();
    var counts = { a: 0, d: 0, x: 0 };
    // Only count CURRENT version's feedback for each section present on this page
    document.querySelectorAll('.fb[data-id]').forEach(function(fbEl){
      var id = fbEl.dataset.id;
      var ver = fbEl.dataset.ver || '1';
      var fb = getFB(data, id, ver);
      if (fb && fb.c) counts[fb.c] = (counts[fb.c] || 0) + 1;
    });
    var a = document.getElementById('ca2'), d = document.getElementById('cd2'), x = document.getElementById('cx2');
    if (a) a.textContent = counts.a;
    if (d) d.textContent = counts.d;
    if (x) x.textContent = counts.x;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Inject shared CSS
  var css = '.fb{margin:14px 0 4px;padding:14px 18px;border-top:1px solid var(--brd,#2A2D3A);background:rgba(255,255,255,.015)}' +
    '.fb-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}' +
    '.fb-l{font-size:11px;color:var(--text3,#6B7084)}' +
    '.fb-ver{font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(251,191,36,.12);color:#fbbf24;font-weight:500}' +
    '.fb-ver[data-state="updated"]{background:rgba(248,113,113,.15);color:#f87171}' +
    '.fb-warn{padding:8px 12px;margin-bottom:10px;background:rgba(251,191,36,.06);border-left:2px solid #fbbf24;border-radius:0 6px 6px 0;font-size:11px;color:#fbbf24;line-height:1.5}' +
    '.fb-d{font-size:12px;color:var(--text2,#9CA0B0);margin-bottom:8px;line-height:1.5}' +
    '.fb-row{display:flex;gap:6px;margin-bottom:8px}' +
    '.fb-b{flex:1;padding:7px 14px;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;border:0.5px solid var(--brd,#2A2D3A);background:transparent;color:var(--text3,#6B7084);transition:all .15s;font-family:inherit}' +
    '.fb-b:hover{background:rgba(255,255,255,.04);color:var(--text,#E8E9ED)}' +
    '.fb-b.s-a{background:rgba(0,184,148,.12);color:#34d399;border-color:rgba(0,184,148,.3)}' +
    '.fb-b.s-d{background:rgba(253,203,110,.12);color:#fbbf24;border-color:rgba(253,203,110,.3)}' +
    '.fb-b.s-x{background:rgba(255,107,107,.12);color:#f87171;border-color:rgba(255,107,107,.3)}' +
    '.fb-n{width:100%;background:var(--bg3,#1C1F2B);border:0.5px solid var(--brd,#2A2D3A);border-radius:6px;padding:7px 10px;font-size:11px;color:var(--text2,#9CA0B0);resize:vertical;min-height:32px;font-family:inherit;line-height:1.5}' +
    '.fb-n:focus{outline:none;border-color:rgba(108,92,231,.4)}' +
    '.fb-hist{margin-top:10px;padding:6px 10px;background:rgba(139,149,168,.04);border-radius:6px;font-size:11px}' +
    '.fb-hist-head{font-size:11px;color:var(--text3,#6B7084);cursor:pointer;font-weight:500;list-style:none;padding:2px 0}' +
    '.fb-hist-head::-webkit-details-marker{display:none}' +
    '.fb-hist[open] .fb-hist-head::before{content:"▾ "}' +
    '.fb-hist:not([open]) .fb-hist-head::before{content:"▸ "}' +
    '.fb-hist-head{padding-left:0}' +
    '.fb-hist[open] .fb-hist-head, .fb-hist:not([open]) .fb-hist-head{padding-left:0}' +
    '.fb-hist-items{margin-top:6px;padding-top:6px;border-top:0.5px solid rgba(139,149,168,.1);display:flex;flex-direction:column;gap:4px}' +
    '.fb-hist-item{display:flex;align-items:flex-start;gap:8px;font-size:11px;line-height:1.5;padding:2px 0}' +
    '.fb-hist-v{font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(139,149,168,.15);color:#8b95a8;font-weight:500;min-width:36px;text-align:center;flex-shrink:0;font-family:monospace}' +
    '.fb-hist-c{font-size:10px;padding:1px 6px;border-radius:3px;flex-shrink:0;font-weight:500}' +
    '.fb-hist-c.h-a{background:rgba(52,211,153,.1);color:#34d399}' +
    '.fb-hist-c.h-d{background:rgba(251,191,36,.1);color:#fbbf24}' +
    '.fb-hist-c.h-x{background:rgba(248,113,113,.1);color:#f87171}' +
    '.fb-hist-n{color:var(--text3,#6B7084);flex:1;word-break:break-word}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Fetch and merge remote feedback-synced.json (git-based team sync)
  // Non-blocking: if fetch fails, just proceed with local data
  async function mergeRemote() {
    try {
      var res = await fetch('/feedback-synced.json', { cache: 'no-store' });
      if (!res.ok) return;
      var remote = await res.json();
      if (!remote || !remote.pages) return;
      var pageKey = PAGE;
      var remotePageData = remote.pages[pageKey];
      if (!remotePageData) return;

      var local = load();
      var merged = Object.assign({ _v: 2 }, local);

      // For each id in remote, merge versions into local (newer timestamp wins)
      Object.keys(remotePageData).forEach(function(id) {
        if (id === '_v') return;
        var remoteSection = remotePageData[id];
        if (!remoteSection || typeof remoteSection !== 'object') return;
        if (!merged[id]) merged[id] = {};
        Object.keys(remoteSection).forEach(function(ver) {
          var remoteFb = remoteSection[ver];
          if (!remoteFb || typeof remoteFb !== 'object') return;
          var localFb = merged[id][ver];
          if (!localFb) {
            merged[id][ver] = remoteFb;
          } else {
            // Compare timestamps — newer wins
            var lt = localFb.t ? Date.parse(localFb.t) : 0;
            var rt = remoteFb.t ? Date.parse(remoteFb.t) : 0;
            if (rt > lt) merged[id][ver] = remoteFb;
          }
        });
      });
      save(merged);
      return merged;
    } catch (e) {
      // Silent — remote sync is optional
      return null;
    }
  }

  // Wait for Supabase client to be ready (loaded from sb.js). Timeout after 3s → fallback to offline mode.
  function waitForSB() {
    return new Promise(function(resolve) {
      if (window.MSC_SB) { resolve(window.MSC_SB); return; }
      var timeout = setTimeout(function() {
        console.warn('[FB] Supabase not ready after 3s, running offline');
        resolve(null);
      }, 3000);
      window.addEventListener('msc-sb-ready', function() {
        clearTimeout(timeout);
        resolve(window.MSC_SB);
      }, { once: true });
    });
  }

  // Fetch latest feedback from Supabase for current page, merge into localStorage
  async function fetchFromSupabase(sb) {
    if (!sb) return;
    try {
      var rows = await sb.fetchAll(PAGE);
      if (!rows || rows.length === 0) return;
      var data = load();
      var changed = false;
      rows.forEach(function(r) {
        if (!data[r.section_id]) data[r.section_id] = {};
        var local = data[r.section_id][r.version];
        var remoteObj = { c: r.choice, n: r.note || '', t: r.updated_at };
        if (!local) { data[r.section_id][r.version] = remoteObj; changed = true; return; }
        var lt = local.t ? Date.parse(local.t) : 0;
        var rt = remoteObj.t ? Date.parse(remoteObj.t) : 0;
        if (rt > lt) {
          data[r.section_id][r.version] = remoteObj;
          changed = true;
        }
      });
      if (changed) save(data);
    } catch(e) { console.warn('[FB] Supabase fetch failed:', e); }
  }

  // Subscribe to realtime changes; re-render affected .fb blocks when remote updates arrive
  function subscribeRealtime(sb) {
    if (!sb) return;
    sb.subscribe(function(payload) {
      var row = payload.new;
      if (!row || row.page_key !== PAGE) return;
      var data = load();
      if (!data[row.section_id]) data[row.section_id] = {};
      var remoteObj = { c: row.choice, n: row.note || '', t: row.updated_at };
      var local = data[row.section_id][row.version];
      // Always take remote on realtime push (it's authoritative for this row)
      data[row.section_id][row.version] = remoteObj;
      save(data);
      // Re-render the affected .fb element if visible
      var fbEl = document.querySelector('.fb[data-id="' + row.section_id + '"][data-ver="' + row.version + '"]');
      if (!fbEl) fbEl = document.querySelector('.fb[data-id="' + row.section_id + '"]:not([data-ver])');
      if (fbEl) {
        renderFB(fbEl, data);
        // Brief flash to indicate remote update
        fbEl.style.transition = 'background 0.3s';
        fbEl.style.background = 'rgba(52,211,153,.12)';
        setTimeout(function(){ fbEl.style.background = ''; }, 1200);
      }
      updateStats(data);
    });
  }

  // Run on DOMContentLoaded
  async function init() {
    migrate();
    // Wait briefly for Supabase, but don't block rendering if it's slow
    var sb = await waitForSB();
    await fetchFromSupabase(sb);
    // Legacy: also merge from git-based feedback-synced.json (for old data not yet in Supabase)
    await mergeRemote();
    var data = load();
    document.querySelectorAll('.fb[data-id]').forEach(function(fbEl){
      renderFB(fbEl, data);
    });
    updateStats(data);
    subscribeRealtime(sb);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.MSC_FB = { load: load, save: save, migrate: migrate, mergeRemote: mergeRemote, fetchFromSupabase: fetchFromSupabase, getFB: getFB, getAllVersions: getAllVersions, parseVer: parseVer, compareVer: compareVer };
})();

/* ═══════════════════════════════════════════════════════════════════════
 * MSC.AI View Filter v1 (v7.4)
 * ───────────────────────────────────────────────────────────────────────
 * Personalized view filtering by role + per-card override.
 *
 * HTML contract:
 *   <div class="card" data-tags="ceo eng">...</div>   ← optional, untagged = always visible
 *   data-tags values: "ceo" | "ui" | "eng" (space-separated, multi-select)
 *
 * Storage:
 *   localStorage["msc_view_role"]      = "ceo" | "ui" | "eng" | "all"
 *   localStorage["msc_view_overrides"] = { "card-key": "show" | "hide", ... }
 *     card-key = `${pagename}::${data-tags or 'untagged'}::${cardIndex}`
 *
 * Behavior:
 *   - First visit anywhere → role picker modal
 *   - Role-relevant cards: subtle highlight (left accent border)
 *   - Role-irrelevant cards: dimmed via CSS grayscale + opacity
 *   - Bulb button (💡) on each .card-head → user override (show/hide)
 *   - Floating "view settings" button bottom-right → change role / reset
 * ═══════════════════════════════════════════════════════════════════════ */
try { (function(){
  var ROLE_KEY = 'msc_view_role';
  var OVERRIDE_KEY = 'msc_view_overrides';
  var ROLES = {
    ceo:  { icon: '🎯', label: 'CEO',     color: '#fbbf24' },
    ui:   { icon: '🎨', label: 'UI 设计', color: '#34d399' },
    eng:  { icon: '⚙️', label: '工程',    color: '#60a5fa' },
    all:  { icon: '👁',  label: '全部',    color: '#a78bfa' }
  };

  // ── Storage helpers ──
  function getRole() {
    return localStorage.getItem(ROLE_KEY);
  }
  function setRole(r) {
    localStorage.setItem(ROLE_KEY, r);
  }
  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY)) || {}; }
    catch(e) { return {}; }
  }
  function setOverrides(o) {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o));
  }
  function cardKey(card, idx) {
    var page = (location.pathname.split('/').pop() || 'index').replace('.html', '');
    var tags = (card.dataset.tags || 'untagged').trim();
    return page + '::' + tags + '::' + idx;
  }

  // ── Inject CSS ──
  function injectCSS() {
    if (document.getElementById('msc-view-css')) return;
    var css = [
      // Card states
      '.card[data-view-state="relevant"] {',
      '  border-left: 3px solid var(--view-accent, #34d399) !important;',
      '  box-shadow: 0 0 0 1px var(--view-accent-soft, rgba(52,211,153,0.15)) inset;',
      '}',
      '.card[data-view-state="dimmed"] {',
      '  opacity: 0.45;',
      '  filter: grayscale(0.6);',
      '  transition: opacity 0.2s, filter 0.2s;',
      '}',
      '.card[data-view-state="dimmed"]:hover {',
      '  opacity: 0.85;',
      '  filter: grayscale(0.2);',
      '}',
      '.card[data-view-state="user-hidden"] {',
      '  opacity: 0.35;',
      '  filter: grayscale(1);',
      '}',
      '.card[data-view-state="user-hidden"]:hover {',
      '  opacity: 0.7;',
      '}',
      // Bulb button
      '.view-bulb {',
      '  display: inline-flex; align-items: center; justify-content: center;',
      '  width: 26px; height: 26px; margin-left: auto;',
      '  background: transparent; border: none; cursor: pointer;',
      '  font-size: 16px; opacity: 0.35; transition: opacity 0.15s, transform 0.15s;',
      '  border-radius: 6px;',
      '}',
      '.view-bulb:hover { opacity: 1; background: rgba(255,255,255,0.06); transform: scale(1.1); }',
      '.view-bulb.is-off { filter: grayscale(1); opacity: 0.5; }',
      '.view-bulb.is-off:hover { opacity: 0.9; }',
      // Tag pills next to card-head
      '.view-tags { display: inline-flex; gap: 4px; margin-left: 8px; font-size: 11px; opacity: 0.5; }',
      '.view-tag { padding: 1px 6px; border-radius: 8px; background: rgba(255,255,255,0.06); }',
      // Floating settings button
      '.view-fab {',
      '  position: fixed; bottom: 20px; right: 20px; z-index: 9998;',
      '  background: #161922; border: 1px solid rgba(255,255,255,0.12);',
      '  border-radius: 24px; padding: 8px 14px; cursor: pointer;',
      '  color: #e5e7eb; font-size: 13px; display: flex; align-items: center; gap: 6px;',
      '  box-shadow: 0 4px 12px rgba(0,0,0,0.4); transition: transform 0.15s, background 0.15s;',
      '}',
      '.view-fab:hover { background: #1f2330; transform: translateY(-2px); }',
      // Modal
      '.view-modal-bg {',
      '  position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999;',
      '  display: flex; align-items: center; justify-content: center;',
      '}',
      '.view-modal {',
      '  background: #161922; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;',
      '  padding: 28px; max-width: 420px; width: 90%; color: #e5e7eb;',
      '  box-shadow: 0 12px 40px rgba(0,0,0,0.6);',
      '}',
      '.view-modal h2 { margin: 0 0 8px; font-size: 18px; }',
      '.view-modal p { margin: 0 0 20px; opacity: 0.7; font-size: 13px; line-height: 1.6; }',
      '.view-roles { display: flex; flex-direction: column; gap: 10px; }',
      '.view-role-btn {',
      '  display: flex; align-items: center; gap: 12px; padding: 14px 16px;',
      '  background: #0f1218; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;',
      '  cursor: pointer; color: #e5e7eb; font-size: 14px; text-align: left;',
      '  transition: background 0.15s, border-color 0.15s;',
      '}',
      '.view-role-btn:hover { background: #1f2330; border-color: rgba(255,255,255,0.2); }',
      '.view-role-btn .icon { font-size: 22px; }',
      '.view-role-btn .label { font-weight: 500; }',
      '.view-role-btn .desc { font-size: 12px; opacity: 0.6; margin-top: 2px; }',
      '.view-role-btn.active { background: #1f2330; border-color: var(--view-accent, #34d399); }',
      '.view-modal-close {',
      '  margin-top: 16px; padding: 8px 16px; background: transparent;',
      '  border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;',
      '  color: #e5e7eb; cursor: pointer; font-size: 13px;',
      '}',
      '.view-modal-close:hover { background: rgba(255,255,255,0.06); }',
      '.view-tip {',
      '  margin-top: 14px; padding: 10px 14px; background: rgba(96,165,250,0.08);',
      '  border: 1px solid rgba(96,165,250,0.2); border-radius: 6px;',
      '  font-size: 12px; opacity: 0.85;',
      '}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'msc-view-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Apply view state to all cards ──
  function applyView() {
    var role = getRole();
    if (!role) return;
    var roleConfig = ROLES[role] || ROLES.all;
    document.documentElement.style.setProperty('--view-accent', roleConfig.color);
    document.documentElement.style.setProperty('--view-accent-soft', roleConfig.color + '26');

    var overrides = getOverrides();
    var cards = document.querySelectorAll('.card');
    var idx = 0;
    cards.forEach(function(card) {
      // Skip cards inside other cards (nested) — only top-level cards get filtered
      if (card.parentElement && card.parentElement.closest('.card')) return;

      var key = cardKey(card, idx);
      idx++;
      var override = overrides[key];
      var tags = (card.dataset.tags || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      var hasTag = tags.length > 0;
      var roleMatches = role === 'all' || (hasTag && tags.indexOf(role) >= 0);

      var state;
      if (override === 'hide') {
        state = 'user-hidden';
      } else if (role === 'all') {
        // "全部" mode: no filtering, no highlights — clean full view
        state = 'neutral';
      } else if (override === 'show') {
        state = hasTag ? 'relevant' : 'neutral';
      } else if (!hasTag) {
        // Untagged cards: always visible, no special state
        state = 'neutral';
      } else if (roleMatches) {
        state = 'relevant';
      } else {
        state = 'dimmed';
      }

      if (state === 'neutral') {
        card.removeAttribute('data-view-state');
      } else {
        card.setAttribute('data-view-state', state);
      }

      // Inject bulb button into card-head
      injectBulb(card, key, state);
    });
  }

  function injectBulb(card, key, state) {
    var head = card.querySelector(':scope > .card-head');
    if (!head) return;
    // Remove existing bulb if any (idempotent)
    var existing = head.querySelector('.view-bulb');
    if (existing) existing.remove();

    var btn = document.createElement('button');
    btn.className = 'view-bulb' + (state === 'user-hidden' ? ' is-off' : '');
    btn.textContent = '💡';
    btn.title = state === 'user-hidden' ? '点亮：恢复显示这块' : '熄灭：在我的视图里隐藏这块';
    btn.setAttribute('data-card-key', key);
    btn.onclick = function(e) {
      e.stopPropagation(); // don't trigger card collapse
      toggleOverride(key);
    };
    head.appendChild(btn);
  }

  function toggleOverride(key) {
    var overrides = getOverrides();
    var current = overrides[key];
    if (current === 'hide') {
      delete overrides[key]; // back to default
    } else {
      overrides[key] = 'hide';
    }
    setOverrides(overrides);
    applyView();
  }

  // ── Role picker modal ──
  function showRoleModal(isFirstTime) {
    var bg = document.createElement('div');
    bg.className = 'view-modal-bg';
    var currentRole = getRole();

    var title = isFirstTime ? '👋 你好，先认识一下' : '切换视图';
    var subtitle = isFirstTime
      ? '你在 MSC.AI 团队里的角色是？我会根据你的角色高亮跟你最相关的内容。'
      : '切换到不同的视角。你的个人隐藏偏好会保留。';

    var rolesHtml = Object.keys(ROLES).map(function(k) {
      var r = ROLES[k];
      var active = currentRole === k ? ' active' : '';
      var desc = {
        ceo: '决策、战略、合规 — 高亮重大方向',
        ui:  '界面方案、视觉规范 — 高亮设计任务',
        eng: '字段、状态机、规格 — 高亮实现细节',
        all: '不过滤任何内容 — 全局视角（推荐项目负责人）'
      }[k];
      return '<button class="view-role-btn' + active + '" data-role="' + k + '">' +
        '<span class="icon">' + r.icon + '</span>' +
        '<div><div class="label">' + r.label + '</div><div class="desc">' + desc + '</div></div>' +
        '</button>';
    }).join('');

    var tip = isFirstTime
      ? '<div class="view-tip">💡 进入页面后，每张卡片右上角有 💡 按钮 — 点一下可以单独隐藏/恢复某块内容，永久记住。</div>'
      : '';

    bg.innerHTML =
      '<div class="view-modal">' +
        '<h2>' + title + '</h2>' +
        '<p>' + subtitle + '</p>' +
        '<div class="view-roles">' + rolesHtml + '</div>' +
        tip +
        (isFirstTime ? '' : '<button class="view-modal-close">关闭</button>') +
      '</div>';

    document.body.appendChild(bg);

    bg.querySelectorAll('.view-role-btn').forEach(function(btn) {
      btn.onclick = function() {
        setRole(btn.dataset.role);
        bg.remove();
        applyView();
        injectFAB();
      };
    });
    var closeBtn = bg.querySelector('.view-modal-close');
    if (closeBtn) closeBtn.onclick = function() { bg.remove(); };
    // Allow click-outside to close (only if not first time)
    if (!isFirstTime) {
      bg.onclick = function(e) {
        if (e.target === bg) bg.remove();
      };
    }
  }

  // ── Floating settings button ──
  function injectFAB() {
    var existing = document.querySelector('.view-fab');
    if (existing) existing.remove();
    var role = getRole();
    if (!role) return;
    var r = ROLES[role] || ROLES.all;
    var fab = document.createElement('button');
    fab.className = 'view-fab';
    fab.innerHTML = '<span>' + r.icon + '</span><span>视图：' + r.label + '</span><span style="opacity:0.5;font-size:11px;">▾</span>';
    fab.title = '点击切换视图';
    fab.onclick = function() { showRoleModal(false); };
    document.body.appendChild(fab);
  }

  // ── Init ──
  function initView() {
    injectCSS();
    var role = getRole();
    if (!role) {
      // First-time visitor: show modal
      showRoleModal(true);
    } else {
      applyView();
      injectFAB();
    }
  }

  // Wait for DOM ready, then run after fb.js init has done its rendering pass
  function start() {
    // Slight delay to let fb.js render feedback blocks first
    setTimeout(initView, 100);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Expose for debugging / external triggers
  window.MSC_VIEW = {
    getRole: getRole,
    setRole: function(r) { setRole(r); applyView(); injectFAB(); },
    showPicker: function() { showRoleModal(false); },
    reset: function() {
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(OVERRIDE_KEY);
      location.reload();
    },
    apply: applyView
  };
})(); } catch(e) { console.warn('[MSC View Filter] init failed, feature disabled:', e); }
