/*
 * MSC.AI Shared Navigation v7
 * Add <script src="/nav.js"></script> to any page — sidebar auto-injects
 * v6: A-F prefixes on all pages, unified naming
 * v7.4: added v7.4 changelog entry
 */
(function(){
const PAGES = [
  { cat: '产品体验', icon: '📋', items: [
    { href: 'chatA.html', label: 'A · 信任与安全感', badge: '关键', badgeColor: '#f87171' },
    { href: 'chatB.html', label: 'B · 空状态+反馈闭环', badge: '关键', badgeColor: '#f87171' },
    { href: 'chatC.html', label: 'C · 卡片+金额感知' },
    { href: 'chatD.html', label: 'D · 确认+留存+异常' },
  ]},
  { cat: '商业机制', icon: '🔐', items: [
    { href: 'chatE.html', label: 'E · AI资产确权', badge: '已更新', badgeColor: '#fbbf24' },
    { href: 'chatF.html', label: 'F · 裂变增长·任务体系', badge: '已更新', badgeColor: '#fbbf24' },
    { href: 'chatG.html', label: 'G · 任务品类·UI规范', badge: '新', badgeColor: '#34d399' },
    { href: 'chatH.html', label: 'H · AI自动审核流程', badge: '提案', badgeColor: '#A29BFE' },
    { href: 'chatJ.html', label: 'J · 资产交易结算中心', badge: '战略', badgeColor: '#81ECEC' },
    { href: 'chatK.html', label: 'K · 交易平台 UI 设计', badge: '产品', badgeColor: '#81ECEC' },
  ]},
  { cat: '工程交付', icon: '📐', items: [
    { href: 'architecture.html', label: '🏗️ 界面架构方案', badge: '已定', badgeColor: '#34d399' },
    { href: 'product-spec.html', label: '📦 产品规格文档' },
  ]},
  { cat: '更新记录', icon: '📋', items: [
    { href: 'changelog.html#v7.8.0', label: 'v7.8.0 · chatK 扩展 B 端', badge: '里程碑', badgeColor: '#81ECEC' },
    { href: 'changelog.html#v7.7.1', label: 'v7.7.1 · chatK 色彩 + 鹿角茶案例', badge: '微调', badgeColor: '#81ECEC' },
    { href: 'changelog.html#v7.7.0', label: 'v7.7.0 · chatK 交易平台 UI', badge: '里程碑', badgeColor: '#D48BB0' },
    { href: 'changelog.html#v7.6.0', label: 'v7.6.0 · chatJ 结算中心战略', badge: '里程碑', badgeColor: '#81ECEC' },
    { href: 'changelog.html#v7.5.0', label: 'v7.5.0 · 产品规格同步', badge: '里程碑', badgeColor: '#F9CA24' },
    { href: 'changelog.html#v7.4.8', label: 'v7.4.8 · architecture 折叠修复' },
    { href: 'changelog.html#v7.4.7', label: 'v7.4.7 · E nav + 孤儿防御' },
    { href: 'changelog.html#v7.4.6', label: 'v7.4.6 · nav 统一风格' },
    { href: 'changelog.html#v7.4.5', label: 'v7.4.5 · A/B/G/H 布局统一' },
    { href: 'changelog.html#v7.4.4', label: 'v7.4.4 · E/F 遮挡紧急修复' },
    { href: 'changelog.html#v7.4.3', label: 'v7.4.3 · 顶部悬空修复' },
    { href: 'changelog.html#v7.4.2', label: 'v7.4.2 · 折叠真正修复' },
    { href: 'changelog.html#v7.4.1', label: 'v7.4.1 · 视图过滤+保护修复' },
    { href: 'changelog.html#v7.3.1', label: 'v7.3.1 · 批量推送修复' },
    { href: 'changelog.html#v7.3', label: 'v7.3 · Supabase 实时后端' },
    { href: 'changelog.html#v7.2', label: 'v7.2 · Git-based 团队同步' },
    { href: 'changelog.html#v7.1', label: 'v7.1 · 决策面板修复+导入导出' },
    { href: 'changelog.html#v7', label: 'v7 · 决策面板+首页修复' },
    { href: 'changelog.html#v6', label: 'v6 · 三级定价+CEO反馈整合' },
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
  .msn-pinned{display:flex;align-items:center;gap:10px;margin:10px 12px;padding:12px 14px;background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(96,165,250,.08));border:1px solid rgba(52,211,153,.25);border-radius:10px;text-decoration:none;color:#f0f2f5;transition:all .2s;position:relative}
  .msn-pinned:hover{background:linear-gradient(135deg,rgba(52,211,153,.18),rgba(96,165,250,.12));border-color:rgba(52,211,153,.5);transform:translateX(1px)}
  .msn-pinned-current{background:linear-gradient(135deg,rgba(52,211,153,.22),rgba(96,165,250,.14)) !important;border-color:rgba(52,211,153,.6) !important;box-shadow:0 0 0 1px rgba(52,211,153,.3)}
  .msn-pinned-icon{width:28px;height:28px;border-radius:8px;background:rgba(52,211,153,.2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
  .msn-pinned-body{flex:1;min-width:0}
  .msn-pinned-title{font-size:13px;font-weight:700;color:#34d399;line-height:1.3}
  .msn-pinned-sub{font-size:10px;color:#8b95a8;font-weight:400;margin-top:1px;line-height:1.3}
  .msn-pinned-arr{font-size:12px;color:#34d399;flex-shrink:0;font-weight:700}
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
  .header,.site-header{top:0 !important}
  /* v7.4.3: same fix for .nav (was top:88px = 36 header gap + 52 header height, now just 52) */
  .nav,.nav-bar{top:52px !important}
  /* v7.4.5: chatA .site-header height is ~57px (padding:16px + 25px content), so its nav-bar
     needs more than 52px. Use min offset per page — A nav uses 60px via override. */
  /* v7.4.4: removed global .summary-bar{top:49px} — was breaking chatE/F (fixed bottom bar) */
  /* v7.4.3: ensure sticky header has solid (not translucent) background
     so content underneath doesn't bleed through. */
  .header,.site-header{background:#0D0F14 !important;backdrop-filter:none !important}
  .nav,.nav-bar{background:#0D0F14 !important;backdrop-filter:none !important}
  /* v7.4.3: when clicking anchor links, offset scroll so content isn't hidden
     beneath sticky header. */
  .section[id],.card[id],h1[id],h2[id],h3[id],[id^="sec-"]{scroll-margin-top:110px}

  /* ═══════════════════════════════════════════════════════════════════════
   * v7.4.6: UNIFIED NAV TAB STYLE — all pages use A's "bottom-line" style
   * - Default: text muted, transparent 2px bottom border
   * - Active/hover: text in page accent color, bottom border in page accent
   * - Overrides each page's own .nav a styles (background, border, etc)
   * ═══════════════════════════════════════════════════════════════════════ */
  /* Base style for all nav anchors — override background/border from old styles */
  .nav a, .nav-item, .nav-bar a {
    display: inline-flex !important;
    align-items: center !important;
    padding: 10px 14px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    background: transparent !important;
    border: 0 !important;
    border-bottom: 2px solid transparent !important;
    border-radius: 0 !important;
    color: var(--text2, var(--text-muted, #8b95a8)) !important;
    text-decoration: none !important;
    white-space: nowrap !important;
    transition: color 0.15s, border-bottom-color 0.15s !important;
  }
  .nav a:hover, .nav-item:hover, .nav-bar a:hover {
    color: var(--text, #E8E9ED) !important;
  }
  /* Active state — subclass per page so color stays page-specific. Default green. */
  .nav a.active, .nav-item.active, .nav-bar a.active {
    color: var(--accent-green, #34d399) !important;
    border-bottom-color: var(--accent-green, #34d399) !important;
  }
  /* Per-page active color overrides (identified by body class or existing CSS var patterns) */
  /* chatB: blue — override via .nav a.active when page has --blue */
  body.page-chatB .nav a.active { color: #60a5fa !important; border-bottom-color: #60a5fa !important; }
  body.page-chatC .nav a.active { color: #F9CA24 !important; border-bottom-color: #F9CA24 !important; }
  body.page-chatD .nav a.active { color: #f87171 !important; border-bottom-color: #f87171 !important; }
  body.page-chatE .nav a.active { color: #A29BFE !important; border-bottom-color: #A29BFE !important; }
  body.page-chatF .nav a.active { color: #34d399 !important; border-bottom-color: #34d399 !important; }
  body.page-chatG .nav a.active { color: #34d399 !important; border-bottom-color: #34d399 !important; }
  body.page-chatH .nav a.active { color: #A29BFE !important; border-bottom-color: #A29BFE !important; }
  body.page-chatJ .nav a.active { color: #81ECEC !important; border-bottom-color: #81ECEC !important; }
  body.page-chatK .nav a.active { color: #81ECEC !important; border-bottom-color: #81ECEC !important; }
  body.page-changelog .nav a.active { color: #81ECEC !important; border-bottom-color: #81ECEC !important; }
  body.page-architecture .nav a.active { color: #5CE7C8 !important; border-bottom-color: #5CE7C8 !important; }
  body.page-product-spec .nav a.active { color: #e8923d !important; border-bottom-color: #e8923d !important; }

  /* Ensure nav container is sticky on ALL pages (G/H were static before) */
  .nav, .nav-bar {
    position: sticky !important;
    top: 52px !important;
    z-index: 90 !important;
    background: #0D0F14 !important;
    backdrop-filter: none !important;
    border-bottom: 1px solid rgba(255,255,255,0.08) !important;
    overflow-x: auto !important;
    scrollbar-width: none !important;
    margin-bottom: 0 !important;
  }
  /* .nav uses flex directly, padding needed */
  .nav {
    padding: 0 20px !important;
    display: flex !important;
    gap: 2px !important;
  }
  /* .nav-bar wraps .nav-inner which already handles flex + max-width — don't force its padding */
  .nav-bar { padding: 0 !important; }
  .nav-inner { display: flex !important; gap: 2px !important; padding: 0 24px !important; }
  .nav::-webkit-scrollbar, .nav-bar::-webkit-scrollbar { display: none !important; }
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
  <a class="msn-pinned${currentPage==='decisions.html'?' msn-pinned-current':''}" href="/decisions.html">
    <div class="msn-pinned-icon">⭐</div>
    <div class="msn-pinned-body">
      <div class="msn-pinned-title">决策面板</div>
      <div class="msn-pinned-sub">自动聚合CEO反馈 · 推荐入口</div>
    </div>
    <span class="msn-pinned-arr">→</span>
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

/* ═══════════════════════════════════════════════════════════════════════
 * v7.4.6: Unified nav tab behavior across all pages
 * 1. Tag body with page class (for per-page accent color)
 * 2. Intercept anchor clicks: instant jump (no smooth scroll), auto-update .active
 * 3. Scroll-spy: when scrolling freely, highlight the nav tab whose section is in view
 * ═══════════════════════════════════════════════════════════════════════ */
(function(){
  // 1) Tag body with page class
  const pageKey = currentPage.replace('.html', '') || 'index';
  document.body.classList.add('page-' + pageKey);

  // 2) Find all nav anchor links (across both .nav and .nav-bar styles)
  const navLinks = document.querySelectorAll('.nav a[href^="#"], .nav-bar a[href^="#"], .nav-item[href^="#"]');
  if (navLinks.length === 0) return;

  function setActive(activeLink) {
    navLinks.forEach(a => a.classList.remove('active'));
    if (activeLink) activeLink.classList.add('active');
  }

  // 3) Intercept clicks — instant jump, no smooth scroll
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const targetId = href.slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();
      // Instant scroll (not smooth)
      const headerOffset = 110; // header(~52) + nav(~40) + margin
      const rect = target.getBoundingClientRect();
      const targetY = rect.top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: targetY, behavior: 'instant' });
      // Update URL hash without triggering native scroll
      history.replaceState(null, '', href);
      // Immediately set this link active
      setActive(this);
    });
  });

  // 4) Scroll-spy — when user scrolls freely, highlight the nav tab matching
  //    the section currently near the top of viewport.
  //    v7.4.7: keep id and section element paired (was: two parallel arrays,
  //    which silently broke whenever a nav link pointed to a non-existent id)
  const pairs = Array.from(navLinks)
    .map(a => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      return el ? { id: id, el: el, link: a } : null;
    })
    .filter(Boolean);

  let spyTimer = null;
  function updateSpy() {
    const scrollY = window.pageYOffset;
    const offset = 140;
    let activeIdx = -1;
    for (let i = 0; i < pairs.length; i++) {
      const secTop = pairs[i].el.getBoundingClientRect().top + scrollY;
      if (secTop - offset <= scrollY) activeIdx = i;
      else break;
    }
    if (activeIdx >= 0) {
      const activeLink = pairs[activeIdx].link;
      if (!activeLink.classList.contains('active')) {
        setActive(activeLink);
      }
    }
  }
  window.addEventListener('scroll', function() {
    if (spyTimer) return;
    spyTimer = setTimeout(function() { spyTimer = null; updateSpy(); }, 50);
  });
  // Run once on load to sync initial state
  setTimeout(updateSpy, 100);
})();



})();
