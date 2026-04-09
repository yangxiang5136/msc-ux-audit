/*
 * MSC.AI Shared Navigation
 * Add <script src="/nav.js"></script> to any page — sidebar auto-injects
 */
(function(){
const PAGES = [
  { cat: '产品体验', icon: '📋', items: [
    { href: 'chatA.html', label: '🔒 信任与安全感', badge: '关键', badgeColor: '#f87171' },
    { href: 'chatB.html', label: '📭 空状态+反馈', badge: '关键', badgeColor: '#f87171' },
    { href: 'chatC.html', label: '💰 卡片+金额感知' },
    { href: 'chatD.html', label: '🛡️ 确认+留存+异常' },
    { href: 'architecture.html', label: '🏗️ 界面架构方案' },
  ]},
  { cat: '商业机制', icon: '🔐', items: [
    { href: 'chatE.html', label: '📜 AI资产确权', badge: '新', badgeColor: '#2dd4bf' },
    { href: 'chatF.html', label: '🚀 增长·任务·成长', badge: '新', badgeColor: '#2dd4bf' },
  ]},
  { cat: '工程交付', icon: '📐', items: [
    { href: 'product-spec.html', label: '📦 产品规格文档' },
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
    if (item.href === currentPage) currentCat = ci;
  });
});

// Build sidebar HTML
let navHTML = '';
PAGES.forEach((cat, ci) => {
  const isOpen = ci === currentCat;
  let itemsHTML = '';
  cat.items.forEach(item => {
    const isCurrent = item.href === currentPage;
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

})();
