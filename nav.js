/*
 * MSC.AI Shared Navigation v6
 * Add <script src="/nav.js"></script> to any page — sidebar auto-injects
 * v6: A-F prefixes on all pages, unified naming
 */
(function(){
const PAGES = [
  { cat: '产品体验', icon: '📋', items: [
    { href: 'chatA.html', label: 'A · 信任与安全感', badge: '关键', badgeColor: '#f87171' },
    { href: 'chatB.html', label: 'B · 空状态+反馈闭环', badge: '关键', badgeColor: '#f87171' },
    { href: 'chatC.html', label: 'C · 卡片+金额感知' },
    { href: 'chatD.html', label: 'D · 确认+留存+异常' },
    { href: 'architecture.html', label: '🏗️ 界面架构方案', badge: '已定', badgeColor: '#34d399' },
  ]},
  { cat: '商业机制', icon: '🔐', items: [
    { href: 'chatE.html', label: 'E · AI资产确权', badge: '已更新', badgeColor: '#fbbf24' },
    { href: 'chatF.html', label: 'F · 裂变增长·任务体系', badge: '已更新', badgeColor: '#fbbf24' },
    { href: 'chatG.html', label: 'G · 任务品类·UI规范', badge: '新', badgeColor: '#34d399' },
    { href: 'chatH.html', label: 'H · AI自动审核流程', badge: '提案', badgeColor: '#A29BFE' },
  ]},
  { cat: '工程交付', icon: '📐', items: [
    { href: 'product-spec.html', label: '📦 产品规格文档' },
  ]},
  { cat: '更新记录', icon: '📋', items: [
    { href: 'changelog.html#v6', label: 'v6 · 三级定价+CEO反馈整合', badge: '最新', badgeColor: '#34d399' },
    { href: 'changelog.html#v5', label: 'v5 · chatF重写+确权交互' },
    { href: 'changelog.html#v4', label: 'v4 · CEO反馈修改' },
    { href: 'changelog.html#v3', label: 'v3 · 统一导航' },
    { href: 'changelog.html#v2', label: 'v2 · 新增E/F模块' },
    { href: 'changelog.html#v1', label: 'v1 · 初版上线' },
  ]},
];

const currentPage = location.pathname.split('/').pop() || 'index.html';
const isHome = currentPage === '' || currentPage === 'index.html';

// Don't inject on index page (it has its own sidebar)
if (isHome) return;

// Find which category the current page belongs to
let currentCat = -1;
PAGES.forEach((cat, ci) => {
  cat.items.forEach(item => {
    if (item.href === currentPage || currentPage.startsWith(item.href.split('#')[0])) currentCat = ci;
  });
});

// Build sidebar HTML
let navHTML = '';
PAGES.forEach((cat, ci) => {
  const isOpen = ci === currentCat;
  let itemsHTML = '';
  cat.items.forEach(item => {
    const isCurrent = item.href.split('#')[0] === currentPage;
    const badge = item.badge ? `<span style="margin-left:auto;font-size:9px;padding:1px 5px;border-radius:3px;font-weight:600;background:${item.badgeColor}22;color:${item.badgeColor}">${item.badge}</span>` : '';
    itemsHTML += `<a class="msn-item${isCurrent?' msn-current':''}" href="/${item.href}">${item.label}${badge}</a>`;
  });
  navHTML += `
    <div class="msn-cat">
      <div class="msn-cat-h${isOpen?' open':''}" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('show')">
        <span class="msn-ci">${cat.icon}</span>${cat.cat}<span class="msn-ca">▶</span>
      </div>
      <div class="msn-cat-items${isOpen?' show':''}">${itemsHTML}</div>
    </div>`;
});

// Inject CSS
const style = document.createElement('style');
style.textContent = `
  .msn-sidebar{width:240px;background:#0e1118;border-right:1px solid rgba(255,255,255,.06);position:fixed;top:0;left:0;bottom:0;overflow-y:auto;z-index:9000;transition:transform .3s;font-family:'Noto Sans SC','PingFang SC',sans-serif}
  .msn-home{display:flex;align-items:center;gap:8px;padding:16px;border-bottom:1px solid rgba(255,255,255,.06);text-decoration:none;color:#f0f2f5;font-size:13px;font-weight:600;transition:background .15s}
  .msn-home:hover{background:rgba(255,255,255,.04)}
  .msn-home-icon{width:30px;height:30px;background:linear-gradient(135deg,#34d399,#60a5fa);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:#000;flex-shrink:0}
  .msn-cat{border-bottom:1px solid rgba(255,255,255,.06)}
  .msn-cat-h{display:flex;align-items:center;gap:8px;padding:11px 16px;cursor:pointer;font-size:12px;font-weight:600;color:#8b95a8;transition:all .15s;user-select:none}
  .msn-cat-h:hover{background:rgba(255,255,255,.04);color:#f0f2f5}
  .msn-ci{font-size:14px;flex-shrink:0}
  .msn-ca{margin-left:auto;font-size:8px;color:#5a6478;transition:transform .2s}
  .msn-cat-h.open .msn-ca{transform:rotate(90deg)}
  .msn-cat-items{display:none;padding:0 0 6px}
  .msn-cat-items.show{display:block}
  .msn-item{display:flex;align-items:center;gap:6px;padding:6px 16px 6px 38px;font-size:11px;color:#5a6478;text-decoration:none;transition:all .15s;line-height:1.4}
  .msn-item:hover{color:#f0f2f5;background:rgba(255,255,255,.04)}
  .msn-current{color:#34d399 !important;background:rgba(52,211,153,.06) !important;font-weight:600}
  .msn-mob-btn{display:none;position:fixed;top:12px;left:12px;z-index:9001;background:rgba(14,17,24,.9);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#f0f2f5;font-size:18px;padding:6px 10px;cursor:pointer;backdrop-filter:blur(8px)}
  .msn-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:8999}
  .msn-overlay.show{display:block}
  @media(max-width:768px){
    .msn-sidebar{transform:translateX(-100%)}
    .msn-sidebar.open{transform:translateX(0)}
    .msn-mob-btn{display:block}
  }
  @media(min-width:769px){
    body{margin-left:240px !important}
    .header,.summary-bar{left:240px !important}
    .summary-bar{right:0 !important}
  }
  /* Hide old inline top nav when sidebar is present */
  body > div[style*="position:sticky"][style*="z-index:9999"]{display:none !important}
  /* Fix gap: old header was top:36px to account for old nav, now reset to 0 */
  .header{top:0 !important}
`;
document.head.appendChild(style);

// Inject sidebar
const sidebar = document.createElement('nav');
sidebar.className = 'msn-sidebar';
sidebar.id = 'msn-sb';
sidebar.innerHTML = `
  <a class="msn-home" href="/">
    <div class="msn-home-icon">M</div>
    <div><div style="font-size:13px;font-weight:700">MSC.AI</div><div style="font-size:10px;color:#5a6478;font-weight:400">← 返回首页</div></div>
  </a>
  ${navHTML}
`;
document.body.prepend(sidebar);

// Inject mobile button
const mobBtn = document.createElement('button');
mobBtn.className = 'msn-mob-btn';
mobBtn.textContent = '☰';
mobBtn.onclick = function(){
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
};
document.body.appendChild(mobBtn);

// Inject overlay
const overlay = document.createElement('div');
overlay.className = 'msn-overlay';
overlay.id = 'msn-ov';
overlay.onclick = function(){
  sidebar.classList.remove('open');
  this.classList.remove('show');
};
document.body.appendChild(overlay);

// Move feedback blocks outside card-body so they're always visible
document.querySelectorAll('.card-body .fb').forEach(fb => {
  const cardBody = fb.closest('.card-body');
  const card = cardBody?.parentElement;
  if (card && card.classList.contains('card')) {
    card.appendChild(fb);
    fb.style.padding = '12px 18px 14px';
    fb.style.borderTop = '1px solid rgba(255,255,255,.06)';
  }
});

// ═══ Feedback Versioning System ═══
// Each entry: which section was updated, when, what changed
// Badge auto-injects on sections with data-mod="..." attribute
const MODS = {
  'e4.3.v6': { desc: '确权触发mockup定价按钮改三级架构', date: '2026-04-15', ver: 'v6' },
  'e5.3.v6': { desc: '权益对比表头改为免费/租赁/一次性', date: '2026-04-15', ver: 'v6' },
  'e8.1.v6': { desc: '定价改为三级：¥99/周·¥349/月·¥699押金', date: '2026-04-15', ver: 'v6' },
  'f3.1.v6': { desc: '任务品类重写：删涨粉，改App体验测试', date: '2026-04-15', ver: 'v6' },
  'f4.1.v6': { desc: '每日任务池→每日活动基金', date: '2026-04-15', ver: 'v6' },
  'f5.1.v6': { desc: '经验值裂变→直接给钱裂变', date: '2026-04-15', ver: 'v6' },
  'f5.2.v6': { desc: '升级奖励→膨胀红包', date: '2026-04-15', ver: 'v6' },
};

const verStyle = document.createElement('style');
verStyle.textContent = `
  .mod-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(0,184,148,.1);color:#34d399;font-weight:600;margin-left:8px;border:1px solid rgba(0,184,148,.2)}
  .mod-desc{padding:8px 14px;font-size:11px;color:#fbbf24;background:rgba(251,191,36,.05);border-top:1px solid rgba(251,191,36,.15);display:flex;align-items:center;gap:6px;line-height:1.5}
  .mod-desc::before{content:'⚡';font-size:12px;flex-shrink:0}
  .archive-wrap{max-width:960px;margin:32px auto 40px;padding:0 16px}
  .archive-head{background:rgba(139,149,168,.05);border:1px solid rgba(139,149,168,.15);border-radius:10px 10px 0 0;padding:12px 16px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#9CA0B0}
  .archive-head:hover{background:rgba(139,149,168,.08)}
  .archive-head .ar-arr{font-size:10px;transition:transform .2s;margin-left:auto}
  .archive-head.open .ar-arr{transform:rotate(90deg)}
  .archive-body{display:none;background:rgba(22,25,34,.4);border:1px solid rgba(139,149,168,.15);border-top:none;border-radius:0 0 10px 10px;padding:10px 16px 14px}
  .archive-body.show{display:block}
  .archive-hint{font-size:11px;color:#6B7084;margin-bottom:12px;line-height:1.6}
  .archive-item{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;gap:10px;align-items:flex-start;font-size:12px}
  .archive-item:last-child{border-bottom:none}
  .ar-id{font-family:monospace;font-size:11px;color:#6B7084;background:rgba(255,255,255,.03);padding:2px 6px;border-radius:3px;white-space:nowrap;flex-shrink:0}
  .ar-choice{font-size:11px;padding:2px 8px;border-radius:3px;font-weight:600;white-space:nowrap;flex-shrink:0}
  .ar-choice.a{background:rgba(52,211,153,.12);color:#34d399}
  .ar-choice.d{background:rgba(251,191,36,.12);color:#fbbf24}
  .ar-choice.x{background:rgba(248,113,113,.12);color:#f87171}
  .ar-note{color:#9CA0B0;flex:1;font-size:11px;line-height:1.5}
  .ar-delete{margin-left:auto;font-size:10px;padding:2px 6px;border-radius:3px;color:#6B7084;background:transparent;border:1px solid rgba(255,255,255,.08);cursor:pointer}
  .ar-delete:hover{color:#f87171;border-color:rgba(248,113,113,.3)}
`;
document.head.appendChild(verStyle);

// Apply mod badges + scan for archived (orphaned) feedback
setTimeout(() => {
  // 1. Add ⚡ vN update badge to section headings that have corresponding MOD entry
  Object.entries(MODS).forEach(([key, mod]) => {
    const fb = document.querySelector(`.fb[data-id="${key}"]`);
    if (!fb) return;
    const card = fb.closest('.card') || fb.closest('.section');
    if (!card) return;
    const header = card.querySelector('.card-head .cm, .section-head');
    if (header && !header.querySelector('.mod-badge')) {
      const badge = document.createElement('span');
      badge.className = 'mod-badge';
      badge.textContent = `${mod.ver}更新`;
      header.appendChild(badge);
    }
  });

  // 2. Detect orphaned feedback in localStorage (keys with no matching DOM element)
  const pageLetter = location.pathname.match(/chat([A-Z])\.html/)?.[1];
  if (!pageLetter) return;
  const storageKey = `msc_${pageLetter.toLowerCase()}_fb`;
  let localData = {};
  try { localData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}

  const domIds = new Set(Array.from(document.querySelectorAll('.fb[data-id]')).map(el => el.dataset.id));
  const orphaned = Object.entries(localData).filter(([id, v]) => !domIds.has(id) && (v.c || v.n));

  if (orphaned.length === 0) return;

  // Build archive section
  const archiveWrap = document.createElement('div');
  archiveWrap.className = 'archive-wrap';
  const choiceMap = { a: '✓ 同意', d: '💬 讨论', x: '✗ 不同意' };
  let itemsHtml = '';
  orphaned.forEach(([id, v]) => {
    const choice = v.c ? `<span class="ar-choice ${v.c}">${choiceMap[v.c]}</span>` : '';
    const note = v.n ? `<span class="ar-note">"${v.n.replace(/</g, '&lt;')}"</span>` : '<span class="ar-note" style="color:#5a6478">—</span>';
    itemsHtml += `<div class="archive-item"><span class="ar-id">${id}</span>${choice}${note}<button class="ar-delete" onclick="msnDeleteArchive('${storageKey}','${id}',this)">删除</button></div>`;
  });

  archiveWrap.innerHTML = `
    <div class="archive-head" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('show')">
      <span>📁 归档反馈（${orphaned.length}条，板块已更新）</span>
      <span class="ar-arr">▶</span>
    </div>
    <div class="archive-body">
      <div class="archive-hint">以下反馈是你之前对已更新/已删除板块的反馈。更新后的板块需要重新给反馈。可以"删除"清空归档。</div>
      ${itemsHtml}
    </div>
  `;

  // Insert before the footer scripts
  const mainEl = document.querySelector('.main');
  if (mainEl) mainEl.appendChild(archiveWrap);
  else document.body.appendChild(archiveWrap);
}, 300);

// Global helper to delete archived entry
window.msnDeleteArchive = function(storageKey, id, btn) {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
    delete data[id];
    localStorage.setItem(storageKey, JSON.stringify(data));
    btn.closest('.archive-item').style.display = 'none';
  } catch(e) { console.error(e); }
};

})();
