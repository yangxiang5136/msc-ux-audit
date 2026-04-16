/*
 * MSC.AI Feedback System v2 — Version-aware
 * Data model:
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

  // Run on DOMContentLoaded
  function init() {
    var data = migrate();
    document.querySelectorAll('.fb[data-id]').forEach(function(fbEl){
      renderFB(fbEl, data);
    });
    updateStats(data);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.MSC_FB = { load: load, save: save, migrate: migrate, getFB: getFB, getAllVersions: getAllVersions, parseVer: parseVer, compareVer: compareVer };
})();
