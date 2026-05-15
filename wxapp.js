/* =============================================================================
 * /wxapp/ 微信小程序改稿协作框架 · 前端核心模块 v2
 * 重构：2026-05-15 (Will UIUX 原则 + Sean 8 点反馈)
 *
 * 重大变化：
 *   - 一条反馈 = 一个决策对象（annotation 自带 status 生命周期）
 *   - 工具自动停用 · 删除支持 · 拖拽/缩放/旋转
 *   - pin 防重叠
 *   - 评论按 annotation 嵌套
 *   - 状态栏 = 同时控制反馈流 + 画布显隐的过滤器
 *   - 截图上传 (base64 in DB · 500KB 上限)
 *   - 表态从 annotation 移到 comment
 * ============================================================================= */
'use strict';

(function () {
  const ROLE_LABELS = { sean: 'Sean', uiux: 'UIUX', eng: '工程师', ceo: 'CEO' };
  const STATUSES = ['draft','review','accepted','rejected','shipped'];
  const STATUS_LABELS = { draft:'草稿', review:'评审中', accepted:'已采纳', rejected:'已拒绝', shipped:'已开发' };
  const KIND_LABELS  = { note:'笔记', approve:'采纳', reject:'拒绝', block:'阻塞', idea:'想法' };
  const KIND_ICONS   = { note:'💭', approve:'✅', reject:'❌', block:'⛔', idea:'💡' };
  const SHAPE_LABELS = { freehand:'画笔', circle:'圆圈', arrow:'箭头', rect:'矩形', none:'标记' };

  // 设备尺寸预设 · 主流机型
  const DEVICE_PRESETS = {
    ios: [
      { id: 'iphone-se',       label: 'iPhone SE',           w: 320, h: 568 },
      { id: 'iphone-13',       label: 'iPhone 13/14',         w: 375, h: 812 },
      { id: 'iphone-15',       label: 'iPhone 15/16',         w: 393, h: 852 },
      { id: 'iphone-15-plus',  label: 'iPhone 15/16 Plus',    w: 430, h: 932 },
    ],
    android: [
      { id: 'android-compact', label: 'Android 紧凑',         w: 360, h: 640 },
      { id: 'android-standard',label: 'Android 标准',         w: 360, h: 800 },
      { id: 'android-large',   label: 'Android 大屏',         w: 412, h: 915 },
    ],
  };
  const DEVICE_SIZE_KEY = 'wxapp_device_sizes';
  function loadDeviceSizes() {
    try {
      const raw = localStorage.getItem(DEVICE_SIZE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { ios: { w: 375, h: 812, presetId: 'iphone-13' }, android: { w: 360, h: 800, presetId: 'android-standard' } };
  }
  function saveDeviceSizes(sizes) {
    try { localStorage.setItem(DEVICE_SIZE_KEY, JSON.stringify(sizes)); } catch {}
  }

  /* ── Auth · cookie session + 角色 ────────────────────────────────────── */
  const ROLE_KEY = 'wxapp_role';
  const wpAuth = {
    getRole()  { return localStorage.getItem(ROLE_KEY) || ''; },
    setRole(r) { localStorage.setItem(ROLE_KEY, r || ''); },
    clear()    { localStorage.removeItem(ROLE_KEY); },
    async login(token) {
      const r = await fetch('/api/wxapp/login', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || 'token 无效');
      this.setRole(d.role);
      return d.role;
    },
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
    requireLogin() {
      if (!this.getRole()) {
        location.href = 'wxapp-login.html?next=' + encodeURIComponent(location.pathname + location.search);
        return false;
      }
      return true;
    },
  };

  /* ── API 客户端 ────────────────────────────────────────────────────── */
  async function _fetch(url, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts, { headers }));
    if (r.status === 401) { wpAuth.clear(); throw new Error('登录已失效, 请重新登录'); }
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
    get(slug)                  { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug)); },
    create(data)               { return _fetch('/api/wxapp/proposals', { method:'POST', body: JSON.stringify(data) }); },
    patch(slug, data)          { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug), { method:'PATCH', body: JSON.stringify(data) }); },
    comment(slug, data)        { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/comments', { method:'POST', body: JSON.stringify(data) }); },
    annotate(slug, data)       { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/annotations', { method:'POST', body: JSON.stringify(data) }); },
    patchAnnotation(slug, id, data) { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/annotations/' + encodeURIComponent(id), { method:'PATCH', body: JSON.stringify(data) }); },
    deleteAnnotation(slug, id) { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/annotations/' + encodeURIComponent(id), { method:'DELETE' }); },
    uploadScreenshot(slug, dataUri, caption) { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/screenshots', { method:'POST', body: JSON.stringify({ data_uri: dataUri, caption }) }); },
    deleteScreenshot(slug, id) { return _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/screenshots/' + encodeURIComponent(id), { method:'DELETE' }); },
  };

  /* ── 通用工具 ─────────────────────────────────────────────────────── */
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
  function fileToDataUri(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  /* ── Cloudinary 直传 (不经过 Railway · 不存 base64 占 Supabase) ─────── */
  const CLOUDINARY_CLOUD = 'dowmjgsxp';
  const CLOUDINARY_PRESET = 'msc-wxapp';
  async function uploadToCloudinary(file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST',
      body: fd,
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error('Cloudinary 拒绝上传: ' + t.slice(0, 200));
    }
    const data = await r.json();
    if (!data.secure_url) throw new Error('Cloudinary 响应无 secure_url');
    return data.secure_url;
  }

  /* ── Shadow DOM 渲染 · 支持截图作背景 ───────────────────────────── */
  const wpRender = {
    /**
     * @param hostEl 寄存元素
     * @param html 改稿 HTML (空字符串时会落到 backgroundDataUri)
     * @param css 改稿 CSS
     * @param device 'ios' | 'android'
     * @param backgroundDataUri 可选 · 当 html 为空时把这张图作为画布内容
     */
    mountProposal(hostEl, html, css, device, backgroundDataUri) {
      hostEl.innerHTML = '';
      const inner = el('div', { class: 'wp-shadow-anchor', style: { width: '100%', height: '100%' } });
      hostEl.appendChild(inner);
      const shadow = inner.attachShadow({ mode: 'open' });
      const baseCss = `
        :host { all: initial; display:block; width:100%; height:100%; }
        * { box-sizing: border-box; }
        body, html { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif; background:#f6f7f9; color:#1a1a1a; font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased; }
        a { color:#576b95; text-decoration:none; }
        button { font-family:inherit; }
        :host { --wp-device: "${device || 'ios'}"; }
        .wp-bg-screenshot { width:100%; height:100%; object-fit:contain; display:block; background:#000; }
        .wp-empty-hint { display:flex; align-items:center; justify-content:center; height:100%; padding:24px; color:#999; font-size:13px; text-align:center; line-height:1.6; }
      `;
      let body;
      if (html && html.trim()) {
        body = `<div class="wp-frame">${html}</div>`;
      } else if (backgroundDataUri) {
        // 没改稿 HTML 时, 截图自动充当画布内容
        body = `<img class="wp-bg-screenshot" src="${backgroundDataUri}" alt="">`;
      } else {
        body = `<div class="wp-empty-hint">空白画布<br><small>上传截图或写改稿 HTML 后这里会显示内容</small></div>`;
      }
      shadow.innerHTML = `<style>${baseCss}\n${css || ''}</style>\n${body}`;
      return shadow;
    },
  };

  /* ── 防重叠 pin · 输入数组 [{x,y}, ...] 返回 [{x_render,y_render}] ─── */
  function resolveOverlaps(items) {
    const placed = [];
    const MIN_DIST = 4; // 4 个百分点 ≈ 15px on 375px wide canvas
    items.forEach((p) => {
      let x = p.x, y = p.y;
      let safe = false, attempts = 0;
      while (!safe && attempts < 12) {
        safe = true;
        for (const q of placed) {
          const dx = x - q.x_render;
          const dy = y - q.y_render;
          if (Math.hypot(dx, dy) < MIN_DIST) {
            // 沿 45° 方向推开
            x += MIN_DIST * 0.7;
            y += MIN_DIST * 0.7;
            safe = false;
            break;
          }
        }
        attempts++;
      }
      p.x_render = Math.max(2, Math.min(98, x));
      p.y_render = Math.max(2, Math.min(98, y));
      placed.push(p);
    });
    return items;
  }

  /* ── 批注 · transform 解析与应用 ─────────────────────────────────── */
  function applyTransform(groupEl, transformData) {
    const t = transformData || {};
    const tx = t.tx || 0, ty = t.ty || 0;
    const scale = (t.scale != null) ? t.scale : 1;
    const rot = t.rotation || 0;
    // SVG group: 用 transform 属性
    // 注意 viewBox 是 0-100 百分比, 这里 tx/ty 也是百分比单位
    groupEl.setAttribute('transform', `translate(${tx} ${ty}) rotate(${rot}) scale(${scale})`);
  }

  /* ── 批注引擎 · 画笔/已存渲染/选中变换 ────────────────────────── */
  const wpAnnot = {
    state: {
      tool: null,
      drawing: false,
      points: [],
      activeGroup: null,
      activeShape: null,
      role: 'sean',
      transformAbort: null,   // AbortController · 防止 transform 监听器累积
    },

    setTool(tool) { this.state.tool = tool; },

    _roleColor(role) {
      return ({ sean:'#60a5fa', uiux:'#34d399', eng:'#fbbf24', ceo:'#f87171' })[role] || '#8b95a8';
    },

    _ensureSvg(canvasEl) {
      let svg = canvasEl.querySelector('.wp-annot-svg');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('class', 'wp-annot-svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        canvasEl.appendChild(svg);
      }
      return svg;
    },

    /** 在 canvasEl 上挂载画笔事件。getRole 是函数, onComplete 在完成一笔后调用 */
    attachDrawing(canvasEl, getRole, onComplete) {
      const svg = this._ensureSvg(canvasEl);

      const pctOf = (evt) => {
        const r = canvasEl.getBoundingClientRect();
        return { x: ((evt.clientX - r.left) / r.width) * 100, y: ((evt.clientY - r.top) / r.height) * 100 };
      };

      const onDown = (e) => {
        if (!this.state.tool) return;
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        const p = pctOf(e);
        this.state.drawing = true;
        this.state.points = [p];
        this.state.role = getRole() || 'sean';
        const color = this._roleColor(this.state.role);
        // 用 group 包一层方便后续 transform
        const g = document.createElementNS('http://www.w3.org/2000/svg','g');
        g.setAttribute('class', 'wp-annot-group');
        svg.appendChild(g);

        let shape;
        if (this.state.tool === 'freehand') {
          shape = document.createElementNS('http://www.w3.org/2000/svg','path');
          shape.setAttribute('stroke', color);
          shape.setAttribute('d', `M ${p.x} ${p.y}`);
        } else if (this.state.tool === 'circle') {
          shape = document.createElementNS('http://www.w3.org/2000/svg','ellipse');
          shape.setAttribute('stroke', color);
          shape.setAttribute('cx', p.x); shape.setAttribute('cy', p.y);
          shape.setAttribute('rx', 0); shape.setAttribute('ry', 0);
        } else if (this.state.tool === 'arrow') {
          const sg = document.createElementNS('http://www.w3.org/2000/svg','g');
          sg.setAttribute('stroke', color); sg.setAttribute('fill', color);
          const line = document.createElementNS('http://www.w3.org/2000/svg','line');
          line.setAttribute('x1', p.x); line.setAttribute('y1', p.y);
          line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
          const head = document.createElementNS('http://www.w3.org/2000/svg','polyline');
          head.setAttribute('points', ''); head.setAttribute('fill', 'none');
          sg.appendChild(line); sg.appendChild(head);
          shape = sg;
        } else if (this.state.tool === 'rect') {
          shape = document.createElementNS('http://www.w3.org/2000/svg','rect');
          shape.setAttribute('stroke', color);
          shape.setAttribute('x', p.x); shape.setAttribute('y', p.y);
          shape.setAttribute('width', 0); shape.setAttribute('height', 0);
        }
        g.appendChild(shape);
        this.state.activeGroup = g;
        this.state.activeShape = shape;
      };

      const onMove = (e) => {
        if (!this.state.drawing) return;
        const p = pctOf(e);
        this.state.points.push(p);
        const start = this.state.points[0];
        const shape = this.state.activeShape;
        const tool = this.state.tool;
        if (tool === 'freehand') {
          shape.setAttribute('d', shape.getAttribute('d') + ` L ${p.x} ${p.y}`);
        } else if (tool === 'circle') {
          shape.setAttribute('rx', Math.abs(p.x - start.x));
          shape.setAttribute('ry', Math.abs(p.y - start.y));
        } else if (tool === 'arrow') {
          const line = shape.querySelector('line');
          line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
          const ang = Math.atan2(p.y - start.y, p.x - start.x);
          const sz = 2.2;
          const ax1 = p.x - sz * Math.cos(ang - Math.PI/7);
          const ay1 = p.y - sz * Math.sin(ang - Math.PI/7);
          const ax2 = p.x - sz * Math.cos(ang + Math.PI/7);
          const ay2 = p.y - sz * Math.sin(ang + Math.PI/7);
          shape.querySelector('polyline').setAttribute('points', `${ax1},${ay1} ${p.x},${p.y} ${ax2},${ay2}`);
        } else if (tool === 'rect') {
          shape.setAttribute('x', Math.min(start.x, p.x));
          shape.setAttribute('y', Math.min(start.y, p.y));
          shape.setAttribute('width',  Math.abs(p.x - start.x));
          shape.setAttribute('height', Math.abs(p.y - start.y));
        }
      };

      const onUp = () => {
        if (!this.state.drawing) return;
        this.state.drawing = false;
        const points = this.state.points.slice();
        const shape = this.state.activeShape;
        const group = this.state.activeGroup;
        const tool = this.state.tool;
        if (points.length < 2 && tool !== 'circle' && tool !== 'rect') {
          group && group.remove();
          this.state.activeShape = null; this.state.activeGroup = null;
          return;
        }
        const svgPath = group.innerHTML;  // 序列化整个 group 里的 shape
        // 锚点：路径中心
        let sx = 0, sy = 0;
        points.forEach(p => { sx += p.x; sy += p.y; });
        const anchor = { x: +(sx / points.length).toFixed(2), y: +(sy / points.length).toFixed(2) };
        onComplete && onComplete({
          shape: tool,
          svg_path: svgPath,
          anchor_x: anchor.x,
          anchor_y: anchor.y,
          author_role: this.state.role,
          _domGroup: group,
        });
      };

      canvasEl.addEventListener('pointerdown', onDown);
      canvasEl.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },

    /**
     * 把已有 annotations 渲染到 canvas: SVG + pin
     * annotations: 完整 annotation 对象数组
     * device: 'ios' | 'android'
     * filter: 当前状态筛选 ('all' 或 status 字符串)
     * selectedId: 选中的 annotation id
     * onPinClick: pin 被点击的回调 (annotation)
     */
    renderExisting(canvasEl, annotations, device, filter, selectedId, onPinClick) {
      // 清掉旧 pin 和旧 transform-box
      canvasEl.querySelectorAll('.wp-annot-pin, .wp-transform-box').forEach(n => n.remove());
      const svg = this._ensureSvg(canvasEl);
      svg.innerHTML = '';

      // 拿到当前设备下的 annotation，并且按筛选
      const items = annotations.filter(a => a.device === device).map((a, idx) => ({
        ...a,
        _index: idx + 1,
        x: a.anchor_x ?? 50,
        y: a.anchor_y ?? 50,
      }));
      const filtered = (filter === 'all') ? items : items.filter(a => (a.status || 'draft') === filter);

      // 防重叠
      resolveOverlaps(filtered);

      filtered.forEach((a) => {
        // SVG: 注入 group + 应用 transform
        const tmp = document.createElement('div');
        tmp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${a.svg_path || ''}</svg>`;
        const groupChildren = tmp.querySelector('svg').children;
        const g = document.createElementNS('http://www.w3.org/2000/svg','g');
        g.setAttribute('class', 'wp-annot-group');
        g.dataset.annotationId = a.id;
        Array.from(groupChildren).forEach(c => g.appendChild(c));
        applyTransform(g, a.transform_data);
        svg.appendChild(g);

        // pin
        const pin = el('div', {
          class: 'wp-annot-pin role-' + (a.author_role || 'sean'),
          style: {
            left: a.x_render + '%',
            top:  a.y_render + '%',
          },
          title: SHAPE_LABELS[a.shape] + ' · ' + (ROLE_LABELS[a.author_role] || a.author_role || '') +
                 ' · ' + (STATUS_LABELS[a.status || 'draft']),
        }, String(a._index));
        pin.dataset.annotationId = a.id;
        if (a.id === selectedId) pin.style.boxShadow = '0 0 0 3px rgba(255,255,255,.4)';
        pin.addEventListener('click', (e) => { e.stopPropagation(); onPinClick && onPinClick(a, pin); });
        canvasEl.appendChild(pin);
      });

      return filtered;
    },

    /**
     * 给选中的 annotation 渲染变换把手 (移动 + 4 角缩放 + 1 旋转)
     * canvasEl: 画布元素
     * annotation: 完整对象
     * onTransform(newTransformData): 实时回调 (拖拽中)
     * onTransformEnd(newTransformData): 提交回调 (松手)
     */
    renderTransformHandles(canvasEl, annotation, onTransform, onTransformEnd) {
      // 关键修复 · 清掉旧 listener 防止累积导致拖拽漂移
      if (this.state.transformAbort) {
        try { this.state.transformAbort.abort(); } catch {}
        this.state.transformAbort = null;
      }
      // 先清掉旧 DOM 元素
      canvasEl.querySelectorAll('.wp-transform-box, .wp-transform-handle').forEach(n => n.remove());
      if (!annotation) return;

      const g = canvasEl.querySelector(`g.wp-annot-group[data-annotation-id="${annotation.id}"]`);
      if (!g) return;

      // 计算 bbox（基于 SVG 坐标系 0-100 百分比）
      let bbox;
      try { bbox = g.getBBox(); } catch { bbox = { x: 0, y: 0, width: 20, height: 20 }; }
      // 当前 transform
      const t0 = annotation.transform_data || {};
      const tx0 = t0.tx || 0, ty0 = t0.ty || 0;
      const scale0 = (t0.scale != null) ? t0.scale : 1;
      const rot0 = t0.rotation || 0;

      // 在 canvas 上绝对定位的 box
      const box = el('div', { class: 'wp-transform-box' });
      // 把 svg viewBox 的百分比坐标转回 px (canvas 实际尺寸已知)
      const rect = canvasEl.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      // 应用 transform: 这里用近似 - 仅 translate (旋转后的 bbox 计算更复杂, 第一版先支持非旋转)
      const xPct = (bbox.x + tx0);
      const yPct = (bbox.y + ty0);
      const wPct = bbox.width * scale0;
      const hPct = bbox.height * scale0;

      box.style.left   = (xPct / 100 * W) + 'px';
      box.style.top    = (yPct / 100 * H) + 'px';
      box.style.width  = (wPct / 100 * W) + 'px';
      box.style.height = (hPct / 100 * H) + 'px';
      // 旋转把手用 CSS rotation 包一层 wrapper（这里简化处理）
      if (rot0) box.style.transform = `rotate(${rot0}deg)`;
      canvasEl.appendChild(box);

      // 创建把手
      const mkHandle = (cls, posStyle, type) => {
        const h = el('div', { class: 'wp-transform-handle ' + cls });
        Object.assign(h.style, posStyle);
        h.dataset.handleType = type;
        canvasEl.appendChild(h);
        return h;
      };
      // 中心移动把手
      mkHandle('h-move', {
        left: ((xPct + wPct / 2) / 100 * W) + 'px',
        top:  ((yPct + hPct / 2) / 100 * H) + 'px',
      }, 'move');
      // 4 角缩放
      const corners = [
        { dx: 0,    dy: 0,    type: 'nw' },
        { dx: wPct, dy: 0,    type: 'ne' },
        { dx: 0,    dy: hPct, type: 'sw' },
        { dx: wPct, dy: hPct, type: 'se' },
      ];
      corners.forEach(c => {
        mkHandle('h-corner', {
          left: ((xPct + c.dx) / 100 * W) + 'px',
          top:  ((yPct + c.dy) / 100 * H) + 'px',
        }, 'scale-' + c.type);
      });
      // 旋转把手 (顶部上方)
      mkHandle('h-rotate', {
        left: ((xPct + wPct / 2) / 100 * W) + 'px',
        top:  ((yPct - 5) / 100 * H) + 'px',
      }, 'rotate');

      // 拖拽逻辑
      let dragging = null;
      const onDown = (e) => {
        const target = e.target.closest('.wp-transform-handle');
        if (!target) return;
        e.preventDefault(); e.stopPropagation();
        const type = target.dataset.handleType;
        dragging = {
          type,
          startX: e.clientX,
          startY: e.clientY,
          tx0, ty0, scale0, rot0,
          centerX: xPct + wPct / 2,
          centerY: yPct + hPct / 2,
        };
        g.classList.add('dragging');
      };
      const onMove = (e) => {
        if (!dragging) return;
        const dxPct = ((e.clientX - dragging.startX) / W) * 100;
        const dyPct = ((e.clientY - dragging.startY) / H) * 100;
        const t = { tx: dragging.tx0, ty: dragging.ty0, scale: dragging.scale0, rotation: dragging.rot0 };
        if (dragging.type === 'move') {
          t.tx = dragging.tx0 + dxPct;
          t.ty = dragging.ty0 + dyPct;
        } else if (dragging.type.startsWith('scale-')) {
          // 简化处理: 用对角线变化估算 scale
          const initDiag = Math.hypot(wPct, hPct);
          const newDiag = Math.hypot(wPct + (dragging.type.includes('e') ? dxPct : -dxPct),
                                     hPct + (dragging.type.includes('s') ? dyPct : -dyPct));
          const factor = Math.max(0.2, Math.min(5, newDiag / initDiag));
          t.scale = dragging.scale0 * factor;
        } else if (dragging.type === 'rotate') {
          // 用从中心到鼠标位置的角度变化
          const rect2 = canvasEl.getBoundingClientRect();
          const ang0 = Math.atan2(dragging.startY - rect2.top - (dragging.centerY / 100 * H),
                                  dragging.startX - rect2.left - (dragging.centerX / 100 * W));
          const ang1 = Math.atan2(e.clientY - rect2.top - (dragging.centerY / 100 * H),
                                  e.clientX - rect2.left - (dragging.centerX / 100 * W));
          t.rotation = dragging.rot0 + (ang1 - ang0) * 180 / Math.PI;
        }
        applyTransform(g, t);
        onTransform && onTransform(t);
      };
      const onUp = () => {
        if (!dragging) return;
        const finalT = {
          tx: parseFloat(g.getAttribute('transform')?.match(/translate\(([-\d.]+) ([-\d.]+)\)/)?.[1] || 0),
          ty: parseFloat(g.getAttribute('transform')?.match(/translate\(([-\d.]+) ([-\d.]+)\)/)?.[2] || 0),
          scale: parseFloat(g.getAttribute('transform')?.match(/scale\(([-\d.]+)\)/)?.[1] || 1),
          rotation: parseFloat(g.getAttribute('transform')?.match(/rotate\(([-\d.]+)\)/)?.[1] || 0),
        };
        g.classList.remove('dragging');
        dragging = null;
        onTransformEnd && onTransformEnd(finalT);
      };
      canvasEl.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
  };

  /* ── 顶栏注入 ─────────────────────────────────────────────────────── */
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

  /* ── 页面：login ──────────────────────────────────────────────────── */
  async function pageLogin() {
    const form = $('#wp-login-form'); if (!form) return;
    const tokenIn = $('#wp-token-in');
    const btnLogin = $('#wp-btn-login');
    const btnLogout = $('#wp-btn-logout');
    const status = $('#wp-login-status');
    const cur = await wpAuth.verify();
    if (cur) status.textContent = `已登录: ${ROLE_LABELS[cur] || cur} · 30 天免重输`;
    btnLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      const t = tokenIn.value.trim();
      if (!t) return toast('请输入 token', 'error');
      try {
        const role = await wpAuth.login(t);
        toast(`欢迎, ${ROLE_LABELS[role] || role}`, 'success');
        tokenIn.value = '';
        const next = new URLSearchParams(location.search).get('next') || 'wxapp.html';
        setTimeout(() => location.href = next, 500);
      } catch (err) { toast(err.message, 'error'); }
    });
    btnLogout.addEventListener('click', async () => {
      await wpAuth.logout();
      status.textContent = '已登出';
      tokenIn.value = '';
    });
  }

  /* ── 页面：list (基本不变) ────────────────────────────────────────── */
  async function pageList() {
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
        renderStats(rows); renderGrid(rows);
      } catch (e) {
        grid.innerHTML = `<div class="wp-empty">加载失败: ${escapeHtml(e.message)}</div>`;
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
      const filtered = rows.filter(r => !q ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.slug || '').toLowerCase().includes(q) ||
        (r.screen_name || '').toLowerCase().includes(q) ||
        (r.rationale || '').toLowerCase().includes(q));
      if (filtered.length === 0) { grid.innerHTML = '<div class="wp-empty">还没有改稿。点击右上角「新建改稿」开始第一个。</div>'; return; }
      grid.innerHTML = '';
      filtered.forEach(r => grid.appendChild(renderCard(r)));
    }
    function renderCard(r) {
      const thumb = r.original_image_url
        ? el('img', { src: r.original_image_url, alt: r.title })
        : el('div', { class: 'wp-card-thumb-placeholder' }, ['暂无原截图', el('br'), r.screen_name || '']);
      return el('a', { class: 'wp-card s-' + r.status, href: 'wxapp-detail.html?slug=' + encodeURIComponent(r.slug) },
        [
          el('div', { class: 'wp-card-thumb' }, [
            thumb,
            el('div', { class: 'wp-card-status' }, [ el('span', { class: 'wp-status-dot s-' + r.status }), STATUS_LABELS[r.status] || r.status ]),
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
    }
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
    $('#wp-search')?.addEventListener('input', (e) => { filters.q = e.target.value; load(); });
    $('#wp-btn-new')?.addEventListener('click', async () => {
      const slug = prompt('改稿 slug (英文短码, 例如 asset-detail-v1):');
      if (!slug) return;
      const title = prompt('改稿标题:');
      if (!title) return;
      try {
        await wpApi.create({ slug, title, status: 'draft' });
        toast('已创建, 进入编辑…', 'success');
        setTimeout(() => location.href = 'wxapp-detail.html?slug=' + encodeURIComponent(slug), 500);
      } catch (e) { toast(e.message, 'error'); }
    });
    load();
  }

  /* ============================================================================
   * 页面：detail (v2 反馈工作流 · 主要重构发生在这里)
   * ============================================================================ */
  async function pageDetail() {
    if (!wpAuth.getRole()) {
      const role = await wpAuth.verify();
      if (!role) { location.href = 'wxapp-login.html?next=' + encodeURIComponent(location.pathname + location.search); return; }
    }
    injectTopbar();
    await wpAuth.verify();
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) { $('#wp-detail-root').innerHTML = '<div class="wp-empty">缺少 slug 参数</div>'; return; }

    const ACTIVE_SECTION_KEY = 'wxapp_active_section_' + slug;
    const ACTIVE_SCREENSHOT_KEY = 'wxapp_active_screenshot_' + slug;
    const state = {
      slug,
      proposal: null,
      revisions: [],
      comments: [],
      annotations: [],
      screenshots: [],
      filter: 'all',
      selectedId: null,
      deviceMode: 'both', // 'both' | 'ios' | 'android'
      deviceSizes: loadDeviceSizes(),
      activeSection: localStorage.getItem(ACTIVE_SECTION_KEY) || '',
      activeScreenshotId: localStorage.getItem(ACTIVE_SCREENSHOT_KEY) || null,
    };
    function setActiveSection(s) {
      state.activeSection = s || '';
      localStorage.setItem(ACTIVE_SECTION_KEY, state.activeSection);
    }
    function setActiveScreenshot(id) {
      state.activeScreenshotId = id;
      if (id) localStorage.setItem(ACTIVE_SCREENSHOT_KEY, id);
      else localStorage.removeItem(ACTIVE_SCREENSHOT_KEY);
    }
    function getSections() {
      // 从子表 distinct 出现有子项 + 始终包含默认 ''
      const s = new Set(['']);
      state.screenshots.forEach(x => x.section && s.add(x.section));
      state.annotations.forEach(x => x.section && s.add(x.section));
      state.comments.forEach(x => x.section && s.add(x.section));
      return Array.from(s);
    }
    function inSection(item) {
      return (item.section || '') === state.activeSection;
    }
    function getActiveScreenshot() {
      const visible = state.screenshots.filter(inSection);
      if (!visible.length) return null;
      const byId = state.activeScreenshotId
        ? visible.find(s => s.id === state.activeScreenshotId)
        : null;
      return byId || visible[visible.length - 1];   // 默认最新一张 (反转后右侧)
    }

    /* ── 加载 ──────────────────────────────────────────────────────── */
    async function load() {
      try {
        const d = await wpApi.get(slug);
        state.proposal    = d.proposal;
        state.revisions   = d.revisions || [];
        state.comments    = d.comments || [];
        state.annotations = d.annotations || [];
        state.screenshots = d.screenshots || [];
        render();
      } catch (e) {
        $('#wp-detail-root').innerHTML = `<div class="wp-empty">加载失败: ${escapeHtml(e.message)}</div>`;
      }
    }

    /* ── 渲染 ─────────────────────────────────────────────────────── */
    function render() {
      const p = state.proposal;
      $('#wp-title').textContent = p.title;
      $('#wp-screen').textContent = p.screen_name || p.slug;

      // 改稿正文 (没改稿 HTML 时, 自动用 active screenshot 作画布背景)
      const activeShot = getActiveScreenshot();
      const bgUri = activeShot ? activeShot.data_uri : null;
      wpRender.mountProposal($('#wp-host-ios'),     p.redesign_html, p.redesign_css, 'ios',     bgUri);
      wpRender.mountProposal($('#wp-host-android'), p.redesign_html, p.redesign_css, 'android', bgUri);

      // 批注层 · 同时受 status filter + section filter 影响
      const sectionAnns = state.annotations.filter(inSection);
      wpAnnot.renderExisting($('#wp-canvas-ios'),     sectionAnns, 'ios',     state.filter, state.selectedId, onPinClick);
      wpAnnot.renderExisting($('#wp-canvas-android'), sectionAnns, 'android', state.filter, state.selectedId, onPinClick);

      // 如果有选中, 渲染 transform handles 在对应设备的画布上
      if (state.selectedId) {
        const sel = state.annotations.find(a => a.id === state.selectedId);
        if (sel) {
          const cvEl = sel.device === 'android' ? $('#wp-canvas-android') : $('#wp-canvas-ios');
          wpAnnot.renderTransformHandles(cvEl, sel,
            null,
            async (newT) => {
              try {
                await wpApi.patchAnnotation(slug, sel.id, { transform_data: newT });
                sel.transform_data = newT;
              } catch (e) { toast(e.message, 'error'); }
            }
          );
        }
      }

      renderScreenshots();
      renderStatusFilter();
      renderFeedbackStream();
      renderMeta();
      renderRevisions();
      $('#wp-rationale').textContent = p.rationale || '（暂无理由说明）';
    }

    /* ── 截图带 · 横滑 + 子项切换 ───────────────────────────────── */
    function renderScreenshots() {
      const list = $('#wp-screenshots-list');
      const upload = $('#wp-screenshot-upload-label');
      // 清掉除 upload 之外所有
      Array.from(list.children).forEach(c => { if (c !== upload) c.remove(); });

      // ① 合并的 title + section pill · 默认子项显示 proposal title, 切换后显示子项名
      // 点击弹下拉 · 切换/新建/重命名都在这一处
      const proposalTitle = state.proposal.title || state.proposal.slug;
      const displayLabel = state.activeSection === '' ? proposalTitle : state.activeSection;
      const subtitle = state.activeSection === '' ? '默认子项' : `子项 · ${proposalTitle}`;
      const titlePill = el('div', { class: 'wp-title-pill wp-title-pill-menu', title: '点击切换/新建/重命名子项' }, [
        el('div', { class: 'wp-tp-text' }, [
          el('span', { class: 'wp-tp-label' }, displayLabel),
          el('span', { class: 'wp-tp-sub' }, subtitle),
        ]),
        el('span', { class: 'wp-tp-arrow' }, '▾'),
      ]);
      titlePill.addEventListener('click', () => openSectionMenu(titlePill));
      list.insertBefore(titlePill, list.firstChild);

      // ③ 截图 · 反转, 按 section 过滤
      const shots = state.screenshots.filter(inSection).slice().reverse();
      const activeShot = getActiveScreenshot();
      shots.forEach((s, idx) => {
        const num = idx + 1;
        const card = el('div', {
          class: 'wp-screenshot-card' + (activeShot && activeShot.id === s.id ? ' active' : ''),
        });
        card.dataset.screenshotId = s.id;
        card.appendChild(el('img', { src: s.data_uri, alt: s.caption || '' }));
        card.appendChild(el('span', { class: 'wp-sc-num' }, String(num)));
        card.appendChild(el('div', { class: 'wp-sc-author' },
          (ROLE_LABELS[s.author_role] || s.author_role || '—') + (s.caption ? ' · ' + s.caption : '')));
        const del = el('button', { class: 'wp-sc-del', title: '删除' }, '×');
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('删除截图 #' + num + '?')) return;
          try { await wpApi.deleteScreenshot(slug, s.id); toast('已删除', 'success'); await load(); }
          catch (err) { toast(err.message, 'error'); }
        });
        card.appendChild(del);
        // 点击 · 设为画布背景 + 滚动居中
        card.addEventListener('click', () => {
          setActiveScreenshot(s.id);
          render();
          card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
        // 双击 · 大图预览
        card.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const w = window.open();
          if (w) w.document.body.innerHTML = `<title>#${num} · ${escapeHtml(s.caption || '')}</title><img src="${s.data_uri}" style="max-width:100%">`;
        });
        list.insertBefore(card, upload);
      });
    }

    /* ── 子项切换菜单 (简易 dropdown) ──────────────────────────────── */
    function openSectionMenu(anchorEl) {
      const sections = getSections();
      // 清掉已有的 menu
      document.querySelectorAll('.wp-section-menu').forEach(n => n.remove());
      const menu = el('div', { class: 'wp-section-menu' });
      sections.forEach(s => {
        const label = s === '' ? '默认子项' : s;
        const counts = state.screenshots.filter(x => (x.section || '') === s).length +
                       state.annotations.filter(x => (x.section || '') === s).length;
        const item = el('div', {
          class: 'wp-sec-menu-item' + (s === state.activeSection ? ' active' : ''),
        }, [
          el('span', { class: 'wp-sec-name' }, label),
          el('span', { class: 'wp-sec-count' }, String(counts)),
        ]);
        item.addEventListener('click', () => {
          setActiveSection(s);
          setActiveScreenshot(null);
          menu.remove();
          render();
        });
        menu.appendChild(item);
      });
      menu.appendChild(el('div', { class: 'wp-sec-menu-sep' }));
      // 新建
      const newItem = el('div', { class: 'wp-sec-menu-item wp-sec-menu-new' }, '＋ 新建子项');
      newItem.addEventListener('click', () => {
        menu.remove();
        const name = prompt('子项名 (例如：注册任务 / AI 确权)：');
        if (!name || !name.trim()) return;
        setActiveSection(name.trim());
        setActiveScreenshot(null);
        render();
        toast(`已切到「${name.trim()}」· 下次上传/批注会归到这个子项`, 'success');
      });
      menu.appendChild(newItem);
      // 重命名当前 (空字符串默认子项不让重命名)
      if (state.activeSection !== '') {
        const renameItem = el('div', { class: 'wp-sec-menu-item' }, '✏️ 重命名「' + state.activeSection + '」');
        renameItem.addEventListener('click', async () => {
          menu.remove();
          const newName = prompt('新名字:', state.activeSection);
          if (!newName || newName === state.activeSection) return;
          await renameSection(state.activeSection, newName.trim());
        });
        menu.appendChild(renameItem);
      }

      // 定位 menu 紧贴 anchor 下方
      document.body.appendChild(menu);
      const r = anchorEl.getBoundingClientRect();
      menu.style.position = 'fixed';
      menu.style.left = r.left + 'px';
      menu.style.top = (r.bottom + 4) + 'px';
      menu.style.zIndex = '999';
      setTimeout(() => {
        document.addEventListener('click', function close(e) {
          if (!menu.contains(e.target) && e.target !== anchorEl) {
            menu.remove(); document.removeEventListener('click', close);
          }
        });
      }, 10);
    }

    async function renameSection(oldName, newName) {
      // 批量改 section · 对每条 annotation/comment/screenshot 调 PATCH (没批量接口, 串行调)
      // 数据量一般不大 (子项内东西有限), 串行可接受
      try {
        const tasks = [];
        state.annotations.filter(a => (a.section || '') === oldName)
          .forEach(a => tasks.push(wpApi.patchAnnotation(slug, a.id, { section: newName })));
        // comment / screenshot 没 PATCH 接口, 先不动 (TODO: 加上)
        await Promise.all(tasks);
        setActiveSection(newName);
        toast('已重命名', 'success');
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    /* ── 状态筛选条 ─────────────────────────────────────────────── */
    function renderStatusFilter() {
      const wrap = $('#wp-status-filter');
      wrap.innerHTML = '';
      // 只算当前 section 内的 annotation
      const sectionAnns = state.annotations.filter(inSection);
      const counts = { all: sectionAnns.length, draft: 0, review: 0, accepted: 0, rejected: 0, shipped: 0 };
      sectionAnns.forEach(a => { counts[a.status || 'draft'] = (counts[a.status || 'draft'] || 0) + 1; });
      const mk = (key, label) => {
        const c = el('button', { class: 'wp-chip ' + (state.filter === key ? 'active ' : '') + (key !== 'all' ? 's-' + key : '') }, [
          label,
          el('span', { class: 'count' }, String(counts[key] || 0)),
        ]);
        c.addEventListener('click', () => {
          state.filter = key;
          state.selectedId = null;
          render();
        });
        return c;
      };
      wrap.appendChild(mk('all', '全部'));
      STATUSES.forEach(s => wrap.appendChild(mk(s, STATUS_LABELS[s])));
    }

    /* ── 反馈流 (annotation 卡 + 嵌套评论) ────────────────────── */
    function renderFeedbackStream() {
      const stream = $('#wp-feedback-stream');
      stream.innerHTML = '';

      // 反馈流: 当前 section + 状态 filter
      const sectionAnns = state.annotations.filter(inSection);
      const visibleAnns = state.filter === 'all'
        ? sectionAnns
        : sectionAnns.filter(a => (a.status || 'draft') === state.filter);

      visibleAnns.forEach((a, idx) => {
        const card = renderFeedbackCard(a, idx + 1);
        stream.appendChild(card);
      });

      // 全局评论 · 也按 section 过滤
      const globalComments = state.comments.filter(c => !c.annotation_id && inSection(c));
      if (globalComments.length) {
        stream.appendChild(el('div', { style: { padding: '8px 4px', fontSize: '11px', color: 'var(--t3)', fontWeight: '600', letterSpacing: '1px' } }, '── 全局评论 ──'));
        globalComments.forEach(c => stream.appendChild(renderGlobalCommentRow(c)));
      }

      if (visibleAnns.length === 0 && globalComments.length === 0) {
        stream.appendChild(el('div', { class: 'wp-empty', style: { padding: '24px' } },
          state.filter === 'all'
            ? '还没有反馈。在画布上选个工具画一下。'
            : `没有「${STATUS_LABELS[state.filter]}」状态的反馈`));
      }
    }

    function renderFeedbackCard(a, displayIdx) {
      const role = a.author_role || 'sean';
      const annComments = state.comments.filter(c => c.annotation_id === a.id);
      const card = el('div', { class: 'wp-fb-card role-' + role + (state.selectedId === a.id ? ' selected' : '') });
      card.dataset.annotationId = a.id;

      // 头部 · 只在 head 切换 selectedId (避免点击 textarea/button 等子元素时误触发收起)
      const head = el('div', { class: 'wp-fb-head', style: { cursor: 'pointer' } }, [
        el('span', { class: 'wp-fb-num role-' + role }, String(displayIdx)),
        el('span', { class: 'wp-fb-shape-tag' }, SHAPE_LABELS[a.shape] || '标记'),
        el('span', { class: 'wp-role-pill role-' + role, style: { fontSize: '10px', padding: '1px 6px' } },
          ROLE_LABELS[role] || role),
        el('span', { class: 'wp-fb-time' }, fmtTime(a.created_at) + ' · ' + (a.device === 'android' ? 'Android' : 'iOS')),
      ]);
      head.addEventListener('click', () => {
        state.selectedId = (state.selectedId === a.id) ? null : a.id;
        render();
      });
      card.appendChild(head);

      // 文本（原 annotation.comment 字段）
      if (a.comment) card.appendChild(el('div', { class: 'wp-fb-body' }, a.comment));

      // 状态行
      const statusRow = el('div', { class: 'wp-fb-status-row' });
      STATUSES.forEach(s => {
        const b = el('button', { class: 'wp-status-pill s-' + s + (a.status === s ? ' active' : '') }, STATUS_LABELS[s]);
        b.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await wpApi.patchAnnotation(slug, a.id, { status: s });
            toast('反馈状态: ' + STATUS_LABELS[s], 'success');
            await load();
          } catch (err) { toast(err.message, 'error'); }
        });
        statusRow.appendChild(b);
      });
      card.appendChild(statusRow);

      // 操作
      const actions = el('div', { class: 'wp-fb-actions' });
      const replyBtn = el('button', {}, '💬 回复');
      const delBtn = el('button', { class: 'wp-fb-delete' }, '🗑 删除');
      const editBtn = el('button', {}, '✏️ 改文本');
      replyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.querySelector('.wp-fb-reply-compose')?.classList.toggle('shown');
      });
      editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const v = prompt('修改批注文本:', a.comment || '');
        if (v === null) return;
        try { await wpApi.patchAnnotation(slug, a.id, { comment: v }); toast('已保存', 'success'); await load(); }
        catch (err) { toast(err.message, 'error'); }
      });
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('删除这条反馈？连带评论也会一起删除。')) return;
        try {
          await wpApi.deleteAnnotation(slug, a.id);
          toast('已删除', 'success');
          state.selectedId = null;
          await load();
        } catch (err) { toast(err.message, 'error'); }
      });
      actions.appendChild(replyBtn);
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);

      // 嵌套回复
      if (annComments.length) {
        const replies = el('div', { class: 'wp-fb-replies' });
        annComments.forEach(c => replies.appendChild(renderReplyRow(c)));
        card.appendChild(replies);
      }

      // 回复 compose
      const compose = el('div', { class: 'wp-fb-reply-compose' });
      const ta = el('textarea', { placeholder: '回复这条反馈...' });
      const kindSel = el('select', {});
      ['note','approve','reject','block','idea'].forEach(k => {
        const o = el('option', { value: k }, KIND_ICONS[k] + ' ' + KIND_LABELS[k]);
        kindSel.appendChild(o);
      });
      const submitBtn = el('button', { class: 'wp-btn-primary' }, '发布回复');
      submitBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const body = ta.value.trim();
        if (!body) return toast('回复内容不能为空', 'error');
        try {
          await wpApi.comment(slug, { body, kind: kindSel.value, annotation_id: a.id });
          ta.value = '';
          compose.classList.remove('shown');
          toast('回复已发布', 'success');
          await load();
        } catch (err) { toast(err.message, 'error'); }
      });
      const actionsRow = el('div', { class: 'wp-fb-reply-actions' }, [kindSel, submitBtn]);
      compose.appendChild(ta);
      compose.appendChild(actionsRow);
      card.appendChild(compose);

      return card;
    }

    function renderReplyRow(c) {
      return el('div', { class: 'wp-fb-reply' }, [
        el('div', { class: 'wp-fb-reply-head' }, [
          el('span', { class: 'wp-role-pill role-' + (c.author_role || 'none') }, ROLE_LABELS[c.author_role] || c.author_role || ''),
          el('span', {}, KIND_ICONS[c.kind] + ' ' + KIND_LABELS[c.kind] || ''),
          el('span', { style: { marginLeft: 'auto', color: 'var(--t4)' } }, fmtTime(c.created_at)),
        ]),
        el('div', { class: 'wp-fb-reply-body' }, c.body || ''),
      ]);
    }

    function renderGlobalCommentRow(c) {
      const node = el('div', { class: 'wp-comment role-' + (c.author_role || 'none') + ' kind-' + c.kind }, [
        el('div', { class: 'c-head' }, [
          el('span', { class: 'wp-role-pill role-' + (c.author_role || 'none') }, ROLE_LABELS[c.author_role] || c.author_role),
          el('span', { class: 'c-kind kind-' + c.kind }, KIND_ICONS[c.kind] + ' ' + (KIND_LABELS[c.kind] || c.kind)),
          el('span', { class: 'c-time' }, fmtTime(c.created_at)),
        ]),
        el('div', { class: 'c-body' }, c.body || ''),
      ]);
      return node;
    }

    function renderMeta() {
      const p = state.proposal;
      const wrap = $('#wp-meta');
      wrap.innerHTML = '';
      [
        ['slug', p.slug],
        ['页面', p.screen_name || '—'],
        ['分镜组', p.flow_group || '—'],
        ['作者', ROLE_LABELS[p.author_role] || p.author_role || '—'],
        ['创建', fmtTime(p.created_at)],
        ['更新', fmtTime(p.updated_at)],
      ].forEach(([k, v]) => wrap.appendChild(el('div', { class: 'wp-meta-row' }, [
        el('span', { class: 'k' }, k), el('span', { class: 'v' }, String(v))
      ])));
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

    /* ── pin 点击 ─────────────────────────────────────────────────── */
    function onPinClick(annotation) {
      state.selectedId = (state.selectedId === annotation.id) ? null : annotation.id;
      render();
      // 把对应的 feedback card 滚到视野中
      setTimeout(() => {
        const card = document.querySelector(`.wp-fb-card[data-annotation-id="${annotation.id}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }

    /* ── 画笔工具 + 自动停用 ─────────────────────────────────────── */
    function bindTools() {
      const tools = $$('.wp-tool[data-tool]');
      let current = null;
      const setActive = (t) => {
        current = t;
        wpAnnot.setTool(t);
        tools.forEach(x => x.classList.toggle('active', x.dataset.tool === t));
        $$('.wp-canvas').forEach(c => c.classList.toggle('draw-mode', !!t));
      };
      tools.forEach(t => t.addEventListener('click', () => {
        setActive(current === t.dataset.tool ? null : t.dataset.tool);
      }));

      const onComplete = (canvasEl, device) => async (data) => {
        // 弹文本输入 (不再问表态 · 表态去 comment 流里)
        const text = prompt('给这条反馈写一句说明（回车跳过 · 之后可在右侧卡片改 · Cancel 放弃这条反馈）：');
        data._domGroup && data._domGroup.remove();
        if (text === null) {
          // 用户点 Cancel · 反馈作废, 不入库, 也停掉工具
          setActive(null);
          toast('反馈已取消', '');
          return;
        }
        try {
          await wpApi.annotate(slug, {
            shape:    data.shape,
            svg_path: data.svg_path,
            device,
            anchor_x: data.anchor_x,
            anchor_y: data.anchor_y,
            comment:  text,
            status:   'draft',
            section:  state.activeSection,
          });
          // 自动停用工具
          setActive(null);
          toast('反馈已保存 · 工具已停用', 'success');
          await load();
        } catch (err) { toast(err.message, 'error'); }
      };

      const iosCv = $('#wp-canvas-ios');
      const andCv = $('#wp-canvas-android');
      wpAnnot.attachDrawing(iosCv, () => wpAuth.getRole(), onComplete(iosCv, 'ios'));
      wpAnnot.attachDrawing(andCv, () => wpAuth.getRole(), onComplete(andCv, 'android'));
    }

    /* ── 设备显隐切换 + 尺寸预设 ──────────────────────────────── */
    function applyDeviceSizes() {
      const sizes = state.deviceSizes;
      const iosCv  = $('#wp-canvas-ios');
      const andCv  = $('#wp-canvas-android');
      iosCv.style.width  = sizes.ios.w + 'px';
      iosCv.style.height = sizes.ios.h + 'px';
      andCv.style.width  = sizes.android.w + 'px';
      andCv.style.height = sizes.android.h + 'px';
      // 更新尺寸标签
      const iosLabel = $('#wp-wrap-ios .wp-canvas-label');
      const andLabel = $('#wp-wrap-android .wp-canvas-label');
      if (iosLabel) iosLabel.textContent = `iOS · ${sizes.ios.w}×${sizes.ios.h}`;
      if (andLabel) andLabel.textContent = `Android · ${sizes.android.w}×${sizes.android.h}`;
    }

    function renderDeviceSizePickers() {
      const iosSel = $('#wp-ios-size-select');
      const andSel = $('#wp-android-size-select');
      if (!iosSel || iosSel.children.length > 0) return; // 只填一次
      DEVICE_PRESETS.ios.forEach(p => iosSel.appendChild(el('option', { value: p.id }, `${p.label} · ${p.w}×${p.h}`)));
      iosSel.appendChild(el('option', { value: 'custom' }, '自定义…'));
      DEVICE_PRESETS.android.forEach(p => andSel.appendChild(el('option', { value: p.id }, `${p.label} · ${p.w}×${p.h}`)));
      andSel.appendChild(el('option', { value: 'custom' }, '自定义…'));
      iosSel.value = state.deviceSizes.ios.presetId || 'iphone-13';
      andSel.value = state.deviceSizes.android.presetId || 'android-standard';

      iosSel.addEventListener('change', () => handleSizeChange('ios', iosSel.value));
      andSel.addEventListener('change', () => handleSizeChange('android', andSel.value));
    }

    function handleSizeChange(platform, presetId) {
      let w, h;
      if (presetId === 'custom') {
        const cur = state.deviceSizes[platform];
        const wIn = prompt(`${platform.toUpperCase()} 自定义宽度 (px):`, String(cur.w || 375));
        if (wIn === null) { renderDeviceSizePickers(); return; }
        const hIn = prompt(`${platform.toUpperCase()} 自定义高度 (px):`, String(cur.h || 812));
        if (hIn === null) return;
        w = Math.max(120, Math.min(800, parseInt(wIn, 10) || 375));
        h = Math.max(200, Math.min(1400, parseInt(hIn, 10) || 812));
      } else {
        const preset = DEVICE_PRESETS[platform].find(p => p.id === presetId);
        if (!preset) return;
        w = preset.w; h = preset.h;
      }
      state.deviceSizes[platform] = { w, h, presetId };
      saveDeviceSizes(state.deviceSizes);
      applyDeviceSizes();
      // 重渲染让 transform handles 跟新尺寸对齐
      render();
    }

    function bindDeviceToggle() {
      $$('.wp-device-toggle [data-device-toggle]').forEach(b => b.addEventListener('click', () => {
        const mode = b.dataset.deviceToggle;
        state.deviceMode = mode;
        $$('.wp-device-toggle [data-device-toggle]').forEach(x => x.classList.toggle('active', x === b));
        $('#wp-wrap-ios').style.display     = (mode === 'android') ? 'none' : '';
        $('#wp-wrap-android').style.display = (mode === 'ios') ? 'none' : '';
      }));
      renderDeviceSizePickers();
      applyDeviceSizes();
    }

    /* ── 全局评论 compose ────────────────────────────────────── */
    function bindGlobalCompose() {
      $('#wp-comment-submit').addEventListener('click', async () => {
        const body = $('#wp-comment-body').value.trim();
        const kind = $('#wp-comment-kind').value;
        if (!body) return toast('评论内容不能为空', 'error');
        try {
          await wpApi.comment(slug, { body, kind, section: state.activeSection });
          $('#wp-comment-body').value = '';
          toast('已发布', 'success');
          await load();
        } catch (e) { toast(e.message, 'error'); }
      });
    }

    /* ── 截图上传 · 三通道：选文件 / 拖拽 / 粘贴 ──────────────────── */
    async function _uploadImageFile(file, source) {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        toast('只能上传图片', 'error'); return;
      }
      const MAX_RAW = 10 * 1024 * 1024;  // 10MB · Cloudinary 默认上限
      if (file.size > MAX_RAW) {
        toast(`图片过大 (${(file.size/1024/1024).toFixed(1)}MB) · 上限 10MB · 压缩或裁剪`, 'error'); return;
      }
      try {
        // ① 直接传到 Cloudinary CDN (不走 Railway, 不占 Supabase)
        toast(`☁️ 上传到 Cloudinary 中…`, '');
        const cloudUrl = await uploadToCloudinary(file);
        // ② 仅把 URL 存到 Supabase (一条几十字节)
        const caption = (source ? `[${source}] ` : '') + new Date().toLocaleString('zh-CN', { hour:'2-digit', minute:'2-digit' });
        const created = await _fetch('/api/wxapp/proposals/' + encodeURIComponent(slug) + '/screenshots', {
          method: 'POST',
          body: JSON.stringify({ data_uri: cloudUrl, caption, section: state.activeSection }),
        });
        if (created && created.id) setActiveScreenshot(created.id);
        toast(`截图已上 Cloudinary · ${source || '文件'} · 子项: ${state.activeSection || '默认'}`, 'success');
        await load();
      } catch (err) { toast(err.message, 'error'); }
    }

    function bindScreenshotUpload() {
      // 通道 1: 文件选择
      const input = $('#wp-screenshot-input');
      input.addEventListener('change', async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        await _uploadImageFile(f, '文件选择');
        input.value = '';
      });

      // 通道 2: 拖拽到 upload 区
      const uploadLabel = $('#wp-screenshot-upload-label');
      ['dragenter','dragover'].forEach(ev =>
        uploadLabel.addEventListener(ev, (e) => { e.preventDefault(); uploadLabel.classList.add('dragover'); })
      );
      ['dragleave','drop'].forEach(ev =>
        uploadLabel.addEventListener(ev, (e) => { e.preventDefault(); uploadLabel.classList.remove('dragover'); })
      );
      uploadLabel.addEventListener('drop', async (e) => {
        e.preventDefault();
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) await _uploadImageFile(f, '拖拽');
      });

      // 通道 3: 粘贴 (⌘V 任何位置都能上传)
      document.addEventListener('paste', async (e) => {
        // 如果焦点在 textarea / input · 不抢粘贴
        const t = document.activeElement;
        if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return;
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              await _uploadImageFile(file, '剪贴板粘贴');
              return;
            }
          }
        }
      });
    }

    /* ── 编辑改稿内容入口（折叠面板里） ────────────────────── */
    function bindEditButtons() {
      $('#wp-edit-html').addEventListener('click', async () => {
        const cur = state.proposal.redesign_html || '';
        const v = prompt('改稿 HTML（.wp- 前缀 · 无 <script>）:', cur);
        if (v === null) return;
        try { await wpApi.patch(slug, { redesign_html: v }); toast('已保存', 'success'); load(); }
        catch (e) { toast(e.message, 'error'); }
      });
      $('#wp-edit-css').addEventListener('click', async () => {
        const cur = state.proposal.redesign_css || '';
        const v = prompt('改稿 CSS:', cur);
        if (v === null) return;
        try { await wpApi.patch(slug, { redesign_css: v }); toast('已保存', 'success'); load(); }
        catch (e) { toast(e.message, 'error'); }
      });
      $('#wp-edit-rationale').addEventListener('click', async () => {
        const cur = state.proposal.rationale || '';
        const v = prompt('改稿理由（Markdown）:', cur);
        if (v === null) return;
        try { await wpApi.patch(slug, { rationale: v }); toast('已保存', 'success'); load(); }
        catch (e) { toast(e.message, 'error'); }
      });
    }

    /* ── 一键绑定 Hammerspoon 截图工具 ─────────────────────────── */
    function bindHammerspoonLink() {
      const btn = $('#wp-bind-hammerspoon');
      if (!btn) return;
      btn.addEventListener('click', () => {
        // 通过 hammerspoon:// URL scheme 把当前 slug 直接传给 Hammerspoon
        // Hammerspoon 端用 hs.urlevent.bind("wxapp-set-proposal", ...) 接收
        const url = 'hammerspoon://wxapp-set-proposal?slug=' + encodeURIComponent(slug);
        window.location.href = url;
        toast(`已发送到 Hammerspoon · 下次 ⌘⌥⇧X 直传「${slug}」`, 'success');
      });
    }

    bindTools();
    bindDeviceToggle();
    bindGlobalCompose();
    bindScreenshotUpload();
    bindEditButtons();
    bindHammerspoonLink();
    await load();
  }

  /* ── 路由分发 ──────────────────────────────────────────────────── */
  function init() {
    const page = document.body.dataset.wxappPage;
    if (page === 'login')  pageLogin();
    if (page === 'list')   pageList();
    if (page === 'detail') pageDetail();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.wxapp = { wpAuth, wpApi, wpRender, wpAnnot };
})();
