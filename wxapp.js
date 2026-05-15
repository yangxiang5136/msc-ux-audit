/* =============================================================================
 * /wxapp/ 微信小程序改稿协作框架 · 前端核心模块
 * 创建：2026-05-15
 *
 * 设计要点：
 *   1. 改稿正文用 Shadow DOM 隔离 · 不污染主页面 CSS · 也不被主页面污染
 *   2. 批注层覆盖在画布上 · 坐标全部百分比化 (0-100) · 跨设备/缩放都对齐
 *   3. token 存 localStorage · 写接口附带 x-wxapp-token · 服务端解出 author_role
 *   4. 一条改稿 = 一屏不滚 · iOS 375×812 / Android 360×800
 *   5. 任何 .wp- 前缀都在主页面命名空间内 · 改稿正文必须以 .wp- 前缀 class 写
 * ============================================================================= */
'use strict';

(function () {
  const ROLE_LABELS = { sean: 'Sean', uiux: 'UIUX', eng: '工程师', ceo: 'CEO' };
  const STATUSES = ['draft','review','accepted','rejected','shipped'];
  const STATUS_LABELS = { draft:'草稿', review:'评审中', accepted:'已采纳', rejected:'已拒绝', shipped:'已开发' };
  const KIND_LABELS  = { note:'笔记', approve:'采纳', reject:'拒绝', block:'阻塞', idea:'想法' };
  const KIND_ICONS   = { note:'💭', approve:'✅', reject:'❌', block:'⛔', idea:'💡' };

  /* ── Auth · cookie session + 角色 ──────────────────────────────────────
   * token 不存在客户端 · 服务端用 HTTP-only cookie (wxapp_session) 持有 30 天
   * localStorage 只缓存 role (用于 UI 展示和重定向判断)
   * 真正的身份校验在服务端: 每次 API 请求 cookie 自动带, 服务端解出 role
   */
  const ROLE_KEY = 'wxapp_role';

  const wpAuth = {
    getRole()  { return localStorage.getItem(ROLE_KEY) || ''; },
    setRole(r) { localStorage.setItem(ROLE_KEY, r || ''); },
    clear()    { localStorage.removeItem(ROLE_KEY); },

    /** 提交 token 给服务端 → 写 cookie → 返回 role */
    async login(token) {
      const r = await fetch('/api/wxapp/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || 'token 无效');
      this.setRole(d.role);
      return d.role;
    },

    /** 借助现有 cookie 验证 · 返回 role 或 null */
    async verify() {
      try {
        const r = await fetch('/api/wxapp/whoami', { credentials: 'same-origin' });
        if (!r.ok) { this.clear(); return null; }
        const d = await r.json();
        this.setRole(d.role);
        return d.role;
      } catch { return null; }
    },

    async logout() {
      try { await fetch('/api/wxapp/logout', { method: 'POST', credentials: 'same-origin' }); }
      catch {}
      this.clear();
    },

    /** 客户端粗判 · 真正校验靠 verify(). 仅用于「界面渲染前快速判断要不要跳登录」 */
    requireLogin() {
      if (!this.getRole()) {
        location.href = 'wxapp-login.html?next=' + encodeURIComponent(location.pathname + location.search);
        return false;
      }
      return true;
    },
  };

  /* ── API 客户端 · cookie 自动带 ──────────────────────────────────────── */
  async function _fetch(url, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts, { headers }));
    if (r.status === 401) {
      wpAuth.clear();
      // 优雅降级 · 当前页可能就是 detail/list, 直接跳登录
      throw new Error('登录已失效, 请重新登录');
    }
    if (r.status === 204) return null;
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    return data;
  }

  const wpApi = {
    list(filters = {}) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v);
      return _fetch('/api/wxapp/proposals' + (qs.toString() ? '?' + qs : ''));
    },
    get(slug)                    { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug)); },
    create(data)                 { return _fetch('/api/wxapp/proposals', { method:'POST', body: JSON.stringify(data) }); },
    patch(slug, data)            { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug), { method:'PATCH', body: JSON.stringify(data) }); },
    comment(slug, data)          { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/comments', { method:'POST', body: JSON.stringify(data) }); },
    annotate(slug, data)         { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/annotations', { method:'POST', body: JSON.stringify(data) }); },
    deleteAnnotation(slug, id)   { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/annotations/' + encodeURIComponent(id), { method:'DELETE' }); },
  };

  /* ── 通用工具 ──────────────────────────────────────────────────────────── */
  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== null && v !== undefined) e.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }
  function fmtTime(t) {
    if (!t) return '';
    const d = new Date(t);
    const now = new Date();
    const ms = now - d;
    if (ms < 60_000) return '刚刚';
    if (ms < 3_600_000) return Math.floor(ms / 60_000) + ' 分钟前';
    if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + ' 小时前';
    if (ms < 30 * 86_400_000) return Math.floor(ms / 86_400_000) + ' 天前';
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function toast(msg, type = '') {
    const t = el('div', { class: 'wp-toast ' + type }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  }

  /* ── 渲染器 · Shadow DOM 隔离 ─────────────────────────────────────────── */
  const wpRender = {
    /**
     * 把改稿 HTML/CSS 注入到 hostEl 的 Shadow Root。
     * @param {HTMLElement} hostEl 容器 (一般是 .wp-host)
     * @param {string} html 改稿正文
     * @param {string} css 改稿 CSS
     * @param {string} device 'ios' | 'android'
     */
    mountProposal(hostEl, html, css, device = 'ios') {
      // 清理旧 shadow root（标准 API 不支持解绑，所以用一个内部容器重置）
      hostEl.innerHTML = '';
      const inner = el('div', { class: 'wp-shadow-anchor', style: { width: '100%', height: '100%' } });
      hostEl.appendChild(inner);
      const shadow = inner.attachShadow({ mode: 'open' });

      // 默认 reset + 基础字体 + 微信调性 (轻量)
      const baseCss = `
        :host { all: initial; display:block; width:100%; height:100%; }
        * { box-sizing: border-box; }
        body, html { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif; background:#f6f7f9; color:#1a1a1a; font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased; }
        a { color:#576b95; text-decoration:none; }
        button { font-family:inherit; }
        /* device 标识让改稿 CSS 可以按设备做条件分支 */
        :host { --wp-device: "${device}"; }
      `;

      shadow.innerHTML = `<style>${baseCss}\n${css || ''}</style>\n<div class="wp-frame">${html || ''}</div>`;
      return shadow;
    },
    /**
     * 列表页缩略：用简化的预览渲染（同样走 Shadow DOM 拉一遍，再缩放）。
     */
    mountThumb(hostEl, html, css) {
      this.mountProposal(hostEl, html, css, 'ios');
    },
  };

  /* ── 批注引擎 · SVG 画笔 · 百分比坐标 ──────────────────────────────────── */
  /**
   * 把坐标系绑到 canvasEl (实际像素) · 输出/输入用百分比 0-100。
   */
  function pctOf(canvasEl, evt) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: ((evt.clientX - rect.left) / rect.width) * 100,
      y: ((evt.clientY - rect.top) / rect.height) * 100,
    };
  }

  const wpAnnot = {
    state: {
      tool: null,        // 'freehand' | 'circle' | 'arrow' | 'rect' | null
      drawing: false,
      points: [],
      activeSvg: null,
      activeShape: null,
      role: 'sean',
    },

    setTool(tool, role) {
      this.state.tool = tool;
      this.state.role = role || 'sean';
    },

    /** 在 canvasEl 上挂载画布与事件。回调 onComplete(annotationData) 在一次绘制完成后调用。 */
    attach(canvasEl, getRole, onComplete) {
      // SVG 层
      let svg = canvasEl.querySelector('.wp-annot-svg');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('class', 'wp-annot-svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        canvasEl.appendChild(svg);
      }
      this.state.activeSvg = svg;

      const onDown = (e) => {
        if (!this.state.tool) return;
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        const p = pctOf(canvasEl, e);
        this.state.drawing = true;
        this.state.points = [p];
        this.state.role = getRole() || 'sean';

        const tool = this.state.tool;
        const color = this._roleColor(this.state.role);

        if (tool === 'freehand') {
          const path = document.createElementNS('http://www.w3.org/2000/svg','path');
          path.setAttribute('stroke', color);
          path.setAttribute('d', `M ${p.x} ${p.y}`);
          svg.appendChild(path);
          this.state.activeShape = path;
        } else if (tool === 'circle') {
          const c = document.createElementNS('http://www.w3.org/2000/svg','ellipse');
          c.setAttribute('stroke', color);
          c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
          c.setAttribute('rx', 0); c.setAttribute('ry', 0);
          svg.appendChild(c);
          this.state.activeShape = c;
        } else if (tool === 'arrow') {
          const g = document.createElementNS('http://www.w3.org/2000/svg','g');
          g.setAttribute('stroke', color); g.setAttribute('fill', color);
          const line = document.createElementNS('http://www.w3.org/2000/svg','line');
          line.setAttribute('x1', p.x); line.setAttribute('y1', p.y);
          line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
          const head = document.createElementNS('http://www.w3.org/2000/svg','polyline');
          head.setAttribute('points', '');
          head.setAttribute('fill', 'none');
          g.appendChild(line); g.appendChild(head);
          svg.appendChild(g);
          this.state.activeShape = g;
        } else if (tool === 'rect') {
          const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
          r.setAttribute('stroke', color);
          r.setAttribute('x', p.x); r.setAttribute('y', p.y);
          r.setAttribute('width', 0); r.setAttribute('height', 0);
          svg.appendChild(r);
          this.state.activeShape = r;
        }
      };

      const onMove = (e) => {
        if (!this.state.drawing) return;
        const p = pctOf(canvasEl, e);
        this.state.points.push(p);
        const shape = this.state.activeShape;
        const tool = this.state.tool;
        const start = this.state.points[0];

        if (tool === 'freehand') {
          const d = shape.getAttribute('d');
          shape.setAttribute('d', d + ` L ${p.x} ${p.y}`);
        } else if (tool === 'circle') {
          const rx = Math.abs(p.x - start.x);
          const ry = Math.abs(p.y - start.y);
          shape.setAttribute('rx', rx); shape.setAttribute('ry', ry);
        } else if (tool === 'arrow') {
          const line = shape.querySelector('line');
          line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
          // 简箭头
          const ang = Math.atan2(p.y - start.y, p.x - start.x);
          const sz = 2;
          const ax1 = p.x - sz * Math.cos(ang - Math.PI / 7);
          const ay1 = p.y - sz * Math.sin(ang - Math.PI / 7);
          const ax2 = p.x - sz * Math.cos(ang + Math.PI / 7);
          const ay2 = p.y - sz * Math.sin(ang + Math.PI / 7);
          const head = shape.querySelector('polyline');
          head.setAttribute('points', `${ax1},${ay1} ${p.x},${p.y} ${ax2},${ay2}`);
        } else if (tool === 'rect') {
          const x = Math.min(start.x, p.x), y = Math.min(start.y, p.y);
          const w = Math.abs(p.x - start.x), h = Math.abs(p.y - start.y);
          shape.setAttribute('x', x); shape.setAttribute('y', y);
          shape.setAttribute('width', w); shape.setAttribute('height', h);
        }
      };

      const onUp = (e) => {
        if (!this.state.drawing) return;
        this.state.drawing = false;
        const points = this.state.points.slice();
        const shape = this.state.activeShape;
        const tool = this.state.tool;
        // 短点击不作数（防误触）
        if (points.length < 2 && tool !== 'circle' && tool !== 'rect') {
          shape && shape.remove();
          return;
        }
        const svgPath = shape.outerHTML;
        // 锚点：路径中心
        const anchor = this._anchorOf(points);
        onComplete && onComplete({
          shape: tool, svg_path: svgPath,
          anchor_x: anchor.x, anchor_y: anchor.y,
          author_role: this.state.role,
          _domNode: shape,
        });
      };

      canvasEl.addEventListener('pointerdown', onDown);
      canvasEl.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },

    _anchorOf(points) {
      if (!points.length) return { x: 50, y: 50 };
      let sx = 0, sy = 0;
      points.forEach(p => { sx += p.x; sy += p.y; });
      return { x: +(sx / points.length).toFixed(2), y: +(sy / points.length).toFixed(2) };
    },

    _roleColor(role) {
      return ({ sean:'#60a5fa', uiux:'#34d399', eng:'#fbbf24', ceo:'#f87171' })[role] || '#8b95a8';
    },

    /** 把已有 annotation 数组渲染到 canvas。 */
    renderExisting(canvasEl, annotations, device, onPinClick) {
      // 清掉旧渲染
      canvasEl.querySelectorAll('.wp-annot-pin').forEach(n => n.remove());
      let svg = canvasEl.querySelector('.wp-annot-svg');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('class','wp-annot-svg');
        svg.setAttribute('viewBox','0 0 100 100');
        svg.setAttribute('preserveAspectRatio','none');
        canvasEl.appendChild(svg);
      } else {
        svg.innerHTML = '';
      }

      annotations.filter(a => a.device === device).forEach((a, idx) => {
        // 注入 svg 内容
        if (a.svg_path) {
          const tmp = document.createElement('div');
          tmp.innerHTML = `<svg>${a.svg_path}</svg>`;
          const child = tmp.querySelector('svg').firstElementChild;
          if (child) svg.appendChild(child);
        }
        // 放置 pin
        const pin = el('div', {
          class: 'wp-annot-pin role-' + (a.author_role || 'sean'),
          style: {
            left:  (a.anchor_x ?? 50) + '%',
            top:   (a.anchor_y ?? 50) + '%',
          },
          title: (KIND_LABELS[a.reaction] || '批注') + ' · ' + (ROLE_LABELS[a.author_role] || a.author_role),
        }, String(idx + 1));
        pin.dataset.annotationId = a.id;
        pin.addEventListener('click', (e) => { e.stopPropagation(); onPinClick && onPinClick(a, pin); });
        canvasEl.appendChild(pin);
      });
    },
  };

  /* ── 顶栏 · 公共 head 注入 ─────────────────────────────────────────────── */
  function injectTopbar(activeKey) {
    const role = wpAuth.getRole();
    const roleLabel = ROLE_LABELS[role] || '未登录';
    const roleClass = role ? 'role-' + role : 'role-none';
    const bar = el('div', { class: 'wp-topbar' });
    bar.innerHTML = `
      <a class="wp-brand" href="wxapp.html">
        <span class="wp-logo">W</span>
        <span>小程序改稿 <small>· MSC.AI</small></span>
      </a>
      <nav class="wp-nav">
        <a href="wxapp.html" ${activeKey==='list'?'class="active"':''}>改稿列表</a>
        <a href="index.html">↩ 回设计中心</a>
        <a href="decisions.html">决策面板</a>
      </nav>
      <div class="wp-me">
        <span class="wp-role-pill ${roleClass}">${escapeHtml(roleLabel)}</span>
        <button class="wp-link-btn" id="wp-topbar-logout" type="button">登出</button>
      </div>
    `;
    document.body.insertBefore(bar, document.body.firstChild);
    bar.querySelector('#wp-topbar-logout').addEventListener('click', async () => {
      await wpAuth.logout();
      location.href = 'wxapp-login.html';
    });
  }

  /* ── 页面：login ──────────────────────────────────────────────────────── */
  async function pageLogin() {
    const form = $('#wp-login-form');
    if (!form) return;
    const tokenIn = $('#wp-token-in');
    const btnLogin = $('#wp-btn-login');
    const btnLogout = $('#wp-btn-logout');
    const status = $('#wp-login-status');

    // 静默尝试 verify (现有 cookie 是否还有效)
    const cur = await wpAuth.verify();
    if (cur) {
      status.textContent = `已登录：${ROLE_LABELS[cur] || cur} · 30 天免重输`;
    }

    btnLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      const t = tokenIn.value.trim();
      if (!t) return toast('请输入 token', 'error');
      try {
        const role = await wpAuth.login(t);
        toast(`欢迎，${ROLE_LABELS[role] || role}`, 'success');
        tokenIn.value = '';
        const next = new URLSearchParams(location.search).get('next') || 'wxapp.html';
        setTimeout(() => location.href = next, 500);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
    btnLogout.addEventListener('click', async () => {
      await wpAuth.logout();
      status.textContent = '已登出';
      tokenIn.value = '';
    });
  }

  /* ── 页面：list ───────────────────────────────────────────────────────── */
  async function pageList() {
    // 真校验靠 cookie. localStorage 只是快路径 · 没有 role 就先去登录
    if (!wpAuth.getRole()) {
      const role = await wpAuth.verify();
      if (!role) { location.href = 'wxapp-login.html?next=' + encodeURIComponent(location.pathname); return; }
    }
    injectTopbar('list');
    await wpAuth.verify();

    const grid = $('#wp-grid');
    const statsEl = $('#wp-stats');
    const filters = { status: '', flow_group: '', author_role: '', q: '' };

    async function load() {
      grid.innerHTML = '<div class="wp-empty"><span class="wp-loading"></span> 加载中…</div>';
      try {
        const rows = await wpApi.list({ status: filters.status, flow_group: filters.flow_group, author_role: filters.author_role });
        renderStats(rows);
        renderGrid(rows);
      } catch (e) {
        grid.innerHTML = `<div class="wp-empty">加载失败：${escapeHtml(e.message)}</div>`;
      }
    }

    function renderStats(rows) {
      statsEl.innerHTML = '';
      const counts = { draft:0, review:0, accepted:0, rejected:0, shipped:0 };
      rows.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
      STATUSES.forEach(s => {
        statsEl.appendChild(el('div', { class: 'wp-stat s-' + s },
          [ el('div', { class: 'wp-stat-n' }, String(counts[s] || 0)),
            el('div', { class: 'wp-stat-l' }, STATUS_LABELS[s]) ]));
      });
    }

    function renderGrid(rows) {
      const q = filters.q.toLowerCase().trim();
      const filtered = rows.filter(r => {
        if (!q) return true;
        return (r.title || '').toLowerCase().includes(q) ||
               (r.slug || '').toLowerCase().includes(q) ||
               (r.screen_name || '').toLowerCase().includes(q) ||
               (r.rationale || '').toLowerCase().includes(q);
      });
      if (filtered.length === 0) {
        grid.innerHTML = '<div class="wp-empty">还没有改稿。点击右上角「新建改稿」开始第一个。</div>';
        return;
      }
      grid.innerHTML = '';
      filtered.forEach(r => grid.appendChild(renderCard(r)));
    }

    function renderCard(r) {
      const thumb = r.original_image_url
        ? el('img', { src: r.original_image_url, alt: r.title })
        : el('div', { class: 'wp-card-thumb-placeholder' }, ['暂无原截图', el('br'), r.screen_name || '']);
      const card = el('a', { class: 'wp-card s-' + r.status, href: 'wxapp-detail.html?slug=' + encodeURIComponent(r.slug) },
        [
          el('div', { class: 'wp-card-thumb' }, [
            thumb,
            el('div', { class: 'wp-card-status' }, [
              el('span', { class: 'wp-status-dot s-' + r.status }),
              STATUS_LABELS[r.status] || r.status,
            ]),
          ]),
          el('div', { class: 'wp-card-body' }, [
            el('div', { class: 'wp-card-title' }, r.title),
            el('div', { class: 'wp-card-sub' }, r.screen_name || r.slug),
            el('div', { class: 'wp-card-meta' }, [
              el('span', { class: 'wp-role-pill role-' + (r.author_role || 'none') }, ROLE_LABELS[r.author_role] || '—'),
              el('span', {}, fmtTime(r.updated_at)),
            ]),
          ]),
        ]);
      return card;
    }

    // 筛选 UI 绑定
    $$('.wp-chip[data-status]').forEach(c => c.addEventListener('click', () => {
      filters.status = c.dataset.status === '*' ? '' : c.dataset.status;
      $$('.wp-chip[data-status]').forEach(x => x.classList.toggle('active', x === c));
      load();
    }));
    $$('.wp-chip[data-role]').forEach(c => c.addEventListener('click', () => {
      filters.author_role = c.dataset.role === '*' ? '' : c.dataset.role;
      $$('.wp-chip[data-role]').forEach(x => x.classList.toggle('active', x === c));
      load();
    }));
    $('#wp-search')?.addEventListener('input', (e) => {
      filters.q = e.target.value;
      load();
    });
    $('#wp-btn-new')?.addEventListener('click', async () => {
      const slug = prompt('改稿 slug (英文短码，例如 asset-detail-v1)：');
      if (!slug) return;
      const title = prompt('改稿标题：');
      if (!title) return;
      try {
        await wpApi.create({ slug, title, status: 'draft' });
        toast('已创建，进入编辑…', 'success');
        setTimeout(() => location.href = 'wxapp-detail.html?slug=' + encodeURIComponent(slug), 500);
      } catch (e) { toast(e.message, 'error'); }
    });

    load();
  }

  /* ── 页面：detail ────────────────────────────────────────────────────── */
  async function pageDetail() {
    if (!wpAuth.getRole()) {
      const role = await wpAuth.verify();
      if (!role) { location.href = 'wxapp-login.html?next=' + encodeURIComponent(location.pathname + location.search); return; }
    }
    injectTopbar();
    await wpAuth.verify();
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) { $('#wp-detail-root').innerHTML = '<div class="wp-empty">缺少 slug 参数</div>'; return; }

    let state = { slug, proposal: null, revisions: [], comments: [], annotations: [], device: 'ios' };

    async function load() {
      try {
        const d = await wpApi.get(slug);
        state.proposal = d.proposal;
        state.revisions = d.revisions || [];
        state.comments = d.comments || [];
        state.annotations = d.annotations || [];
        render();
      } catch (e) {
        $('#wp-detail-root').innerHTML = `<div class="wp-empty">加载失败：${escapeHtml(e.message)}</div>`;
      }
    }

    function render() {
      const p = state.proposal;
      $('#wp-title').textContent = p.title;
      $('#wp-screen').textContent = p.screen_name || p.slug;
      // 渲染双画布
      const iosHost = $('#wp-host-ios');
      const andHost = $('#wp-host-android');
      wpRender.mountProposal(iosHost, p.redesign_html, p.redesign_css, 'ios');
      wpRender.mountProposal(andHost, p.redesign_html, p.redesign_css, 'android');
      // 渲染批注
      const iosCanvas = iosHost.parentElement;
      const andCanvas = andHost.parentElement;
      wpAnnot.renderExisting(iosCanvas, state.annotations, 'ios', showBubble);
      wpAnnot.renderExisting(andCanvas, state.annotations, 'android', showBubble);
      // 元信息
      renderMeta();
      renderComments();
      renderRevisions();
      renderStatusControls();
    }

    function renderMeta() {
      const p = state.proposal;
      const wrap = $('#wp-meta');
      wrap.innerHTML = '';
      const rows = [
        ['slug', p.slug],
        ['页面', p.screen_name || '—'],
        ['分镜组', p.flow_group || '—'],
        ['作者', ROLE_LABELS[p.author_role] || p.author_role || '—'],
        ['创建', fmtTime(p.created_at)],
        ['更新', fmtTime(p.updated_at)],
      ];
      rows.forEach(([k, v]) => wrap.appendChild(el('div', { class: 'wp-meta-row' }, [
        el('span', { class: 'k' }, k), el('span', { class: 'v' }, String(v))
      ])));
      $('#wp-rationale').textContent = p.rationale || '（暂无理由说明）';
    }

    function renderComments() {
      const list = $('#wp-comments-list');
      list.innerHTML = '';
      if (state.comments.length === 0) {
        list.appendChild(el('div', { class: 'wp-empty', style: { padding:'24px' } }, '还没有评论。下方写一条吧。'));
      }
      state.comments.forEach(c => {
        const node = el('div', { class: 'wp-comment role-' + (c.author_role || 'none') + ' kind-' + c.kind }, [
          el('div', { class: 'c-head' }, [
            el('span', { class: 'wp-role-pill role-' + (c.author_role || 'none') }, ROLE_LABELS[c.author_role] || c.author_role),
            el('span', { class: 'c-kind kind-' + c.kind }, KIND_ICONS[c.kind] + ' ' + (KIND_LABELS[c.kind] || c.kind)),
            el('span', { class: 'c-time' }, fmtTime(c.created_at)),
          ]),
          el('div', { class: 'c-body' }, c.body || ''),
        ]);
        list.appendChild(node);
      });
    }

    function renderRevisions() {
      const list = $('#wp-revisions-list');
      list.innerHTML = '';
      if (state.revisions.length === 0) {
        list.appendChild(el('div', { class: 'wp-empty', style: { padding:'18px', fontSize:'12px' } }, '还没有修订历史'));
        return;
      }
      state.revisions.forEach(r => {
        list.appendChild(el('div', { class: 'wp-revision' }, [
          el('span', { class: 'wp-role-pill role-' + (r.author_role || 'none') }, ROLE_LABELS[r.author_role] || r.author_role),
          el('span', {}, '修订'),
          el('time', {}, fmtTime(r.created_at)),
        ]));
      });
    }

    function renderStatusControls() {
      const wrap = $('#wp-status-controls');
      wrap.innerHTML = '';
      STATUSES.forEach(s => {
        const b = el('button', { class: 'wp-status-btn s-' + s + (state.proposal.status === s ? ' active' : '') }, STATUS_LABELS[s]);
        b.addEventListener('click', async () => {
          try {
            await wpApi.patch(slug, { status: s });
            toast('状态已更新', 'success');
            await load();
          } catch (e) { toast(e.message, 'error'); }
        });
        wrap.appendChild(b);
      });
    }

    function showBubble(a, pinEl) {
      // 清掉旧气泡
      document.querySelectorAll('.wp-annot-bubble').forEach(b => b.remove());
      const bubble = el('div', { class: 'wp-annot-bubble' });
      bubble.innerHTML = `
        <div class="b-head">
          <span class="wp-role-pill role-${a.author_role || 'none'}">${escapeHtml(ROLE_LABELS[a.author_role] || a.author_role || '')}</span>
          <span>${escapeHtml(KIND_LABELS[a.reaction] || '')}</span>
          <span style="margin-left:auto;color:var(--t4);">${escapeHtml(fmtTime(a.created_at))}</span>
        </div>
        <div class="b-body">${escapeHtml(a.comment || '（无文本）')}</div>
        ${a.reaction ? `<div class="b-reaction">${KIND_ICONS[a.reaction] || ''} ${escapeHtml(KIND_LABELS[a.reaction] || '')}</div>` : ''}
      `;
      const rect = pinEl.getBoundingClientRect();
      bubble.style.position = 'fixed';
      bubble.style.left = (rect.right + 8) + 'px';
      bubble.style.top  = (rect.top - 4) + 'px';
      document.body.appendChild(bubble);
      // 点击别处关闭
      setTimeout(() => {
        document.addEventListener('click', function close(e) {
          if (!bubble.contains(e.target)) { bubble.remove(); document.removeEventListener('click', close); }
        });
      }, 10);
    }

    /* 工具栏 */
    function bindTools() {
      const tools = $$('.wp-tool[data-tool]');
      let currentTool = null;
      tools.forEach(t => t.addEventListener('click', () => {
        const tool = t.dataset.tool;
        currentTool = (currentTool === tool) ? null : tool;
        wpAnnot.setTool(currentTool, wpAuth.getRole());
        tools.forEach(x => x.classList.toggle('active', x === t && currentTool));
        // toggle pointer-events on canvases
        $$('.wp-canvas').forEach(c => c.classList.toggle('draw-mode', !!currentTool));
      }));

      const compose = (data) => {
        // 让用户补充文本 + 表态再提交
        const text = prompt('给这条批注加文本（可空，回车跳过）：') || '';
        const rxRaw = prompt('表态（approve/reject/block/idea/note，回车跳过）：') || '';
        const reaction = ['approve','reject','block','idea','note'].includes(rxRaw) ? rxRaw : null;
        const device = data._canvasDevice || 'ios';
        delete data._domNode; delete data._canvasDevice;
        Object.assign(data, { device, comment: text, reaction });
        wpApi.annotate(slug, data).then(() => { toast('批注已保存', 'success'); load(); }).catch(e => toast(e.message, 'error'));
      };

      const iosCanvas = $('#wp-canvas-ios');
      const andCanvas = $('#wp-canvas-android');
      [iosCanvas, andCanvas].forEach(c => {
        const device = c.dataset.device;
        wpAnnot.attach(c, () => wpAuth.getRole(), (data) => { data._canvasDevice = device; compose(data); });
      });

      // 设备显隐切换
      $$('.wp-device-toggle [data-device-toggle]').forEach(b => b.addEventListener('click', () => {
        const mode = b.dataset.deviceToggle; // 'ios' | 'android' | 'both'
        $$('.wp-device-toggle [data-device-toggle]').forEach(x => x.classList.toggle('active', x === b));
        $('#wp-wrap-ios').style.display    = (mode === 'android') ? 'none' : '';
        $('#wp-wrap-android').style.display = (mode === 'ios')     ? 'none' : '';
      }));
    }

    /* 评论提交 */
    function bindComposeComment() {
      let curKind = 'note';
      $$('#wp-comment-kind .wp-kind-chip').forEach(c => c.addEventListener('click', () => {
        curKind = c.dataset.kind;
        $$('#wp-comment-kind .wp-kind-chip').forEach(x => x.classList.toggle('active', x === c));
      }));
      $('#wp-comment-submit').addEventListener('click', async () => {
        const body = $('#wp-comment-body').value.trim();
        if (!body) return toast('评论内容不能为空', 'error');
        try {
          await wpApi.comment(slug, { body, kind: curKind });
          $('#wp-comment-body').value = '';
          toast('评论已发布', 'success');
          await load();
        } catch (e) { toast(e.message, 'error'); }
      });
    }

    /* 改稿正文/CSS/rationale 编辑入口 (简易版：弹窗) */
    function bindEdit() {
      $('#wp-edit-html')?.addEventListener('click', async () => {
        const cur = state.proposal.redesign_html || '';
        const v = prompt('改稿 HTML（.wp- 前缀 · 不能有 <script>）：', cur);
        if (v === null) return;
        try { await wpApi.patch(slug, { redesign_html: v }); toast('已保存', 'success'); load(); }
        catch (e) { toast(e.message, 'error'); }
      });
      $('#wp-edit-css')?.addEventListener('click', async () => {
        const cur = state.proposal.redesign_css || '';
        const v = prompt('改稿 CSS：', cur);
        if (v === null) return;
        try { await wpApi.patch(slug, { redesign_css: v }); toast('已保存', 'success'); load(); }
        catch (e) { toast(e.message, 'error'); }
      });
      $('#wp-edit-rationale')?.addEventListener('click', async () => {
        const cur = state.proposal.rationale || '';
        const v = prompt('改稿理由（Markdown）：', cur);
        if (v === null) return;
        try { await wpApi.patch(slug, { rationale: v }); toast('已保存', 'success'); load(); }
        catch (e) { toast(e.message, 'error'); }
      });
      $('#wp-edit-image')?.addEventListener('click', async () => {
        const cur = state.proposal.original_image_url || '';
        const v = prompt('原截图 URL（https:// 或 base64 data:）：', cur);
        if (v === null) return;
        try { await wpApi.patch(slug, { original_image_url: v }); toast('已保存', 'success'); load(); }
        catch (e) { toast(e.message, 'error'); }
      });
    }

    bindTools();
    bindComposeComment();
    bindEdit();
    await load();
  }

  /* ── 路由分发 ──────────────────────────────────────────────────────────── */
  function init() {
    const page = document.body.dataset.wxappPage;
    if (page === 'login')  pageLogin();
    if (page === 'list')   pageList();
    if (page === 'detail') pageDetail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 暴露给控制台/外部调试
  window.wxapp = { wpAuth, wpApi, wpRender, wpAnnot };
})();
