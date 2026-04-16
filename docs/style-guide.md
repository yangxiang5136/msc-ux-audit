# MSC.AI 新页面建设指南

**基准版本**：v7.4.8
**更新日期**：2026-04-16
**面向**：Sean 自己参考 + 未来数据化改造（方向 2）的前端规范基准
**不进网站**

---

## 一、整体原则

这份指南的目的是让新页面跟现有 8 个页面（chatA 到 chatH）保持统一。**现有 8 个页面是标杆**，不是历史遗产——v7.4 到 v7.4.8 的 8 轮 patch 把底层约定收敛到了一起，现在站点有一套清晰的"怎么做新页面"的规则。

**新页面 = 1 个 HTML 文件 + 遵守本文的所有约定**。不需要额外写 JS 或 CSS 文件：`nav.js` 和 `fb.js` 会自动注入统一的样式、反馈系统、视图过滤、scroll-spy。

**三条最关键的约定**（违反任何一条都会踩雷）：

1. **不要定义与 fb.js/nav.js 同名的全局函数**：`tog`、`toggle`、`toggleAll`、`toggleCeo`、`setActive` —— 会被覆盖成 no-op
2. **nav 的所有 `<a href="#xxx">` 必须指向页面里真实存在的 id** —— 孤儿 link 会让 scroll-spy 后续 tab 全部错位
3. **折叠容器必须用 `.card` 或 `.cflow`**（新页面统一用 `.card`），head 用 `onclick="tog(this)"`

---

## 二、视觉规范

### 2.1 颜色系统（唯一一套）

站点历史上有两套变量系统（旧的 `#0a0a12` 系 和 新的 `#0D0F14` 系）。**新页面必须用新系统**，跟 chatE/F/G/H、v7.4 以后的所有工作对齐：

```css
:root {
  /* 背景层（深→浅）*/
  --bg:              #0D0F14;   /* 页面底色 */
  --bg-card:         #161922;   /* 卡片 */
  --bg-card-hover:   #1C1F2B;   /* 卡片 hover */
  --bg-input:        #1E2130;   /* 输入框 */

  /* 边框 */
  --border:          #2A2D3A;
  --border-light:    #353849;

  /* 文字（亮→暗）*/
  --text:            #E8E9ED;   /* 主文字 */
  --text-secondary:  #9CA0B0;   /* 次要文字 */
  --text-muted:      #6B7084;   /* 弱提示 */

  /* 主题色（每页从中选一个做 page accent）*/
  --accent:          #6C5CE7;   /* 紫色（E/H 用）*/
  --accent-light:    #A29BFE;
  --green:           #00B894;   /* 绿色（A/F/G 用）*/
  --green-bg:        rgba(0,184,148,0.12);
  --amber:           #FDCB6E;   /* 琥珀（C 用类似）*/
  --amber-bg:        rgba(253,203,110,0.12);
  --red:             #FF6B6B;
  --red-bg:          rgba(255,107,107,0.12);
  --blue:            #74B9FF;   /* 蓝色（B 用）*/
  --blue-bg:         rgba(116,185,255,0.12);
  --cyan:            #81ECEC;
  --gold:            #F9CA24;
  --gold-bg:         rgba(249,202,36,0.12);
  --chain:           #00CEC9;   /* 青色（架构方案 用）*/
  --chain-bg:        rgba(0,206,201,0.10);

  /* 尺寸 */
  --radius:          12px;
  --radius-sm:       8px;
  --shadow:          0 2px 12px rgba(0,0,0,0.3);
}
```

### 2.2 每页一个主色（page accent）

每个页面选一个变量作为**主色**，用在：header 的 badge、nav active tab 的高亮线、section 编号的数字、重要强调。

**已用配色**（新页面要避开重复）：

| 页面 | 主色 | 变量 |
|------|------|------|
| chatA 信任 | 绿 #34d399 | `--green` |
| chatB 空状态 | 蓝 #60a5fa | `--blue` |
| chatC 卡片 | 金 #F9CA24 | `--gold` |
| chatD 确认 | 红 #f87171 | `--red` |
| chatE 确权 | 紫 #A29BFE | `--accent-light` |
| chatF 裂变 | 绿 #00B894 | `--green` |
| chatG 任务品类 | 绿 #00B894 | `--green` |
| chatH AI 审核 | 紫 #A29BFE | `--accent-light` |
| 架构方案 | 青 #5CE7C8 | `--chain`（近似）|
| 产品规格 | 橙 #e8923d | 自定义 |

**新页面可选**：橙色（但产品规格用了）、粉色 `#FF79C6`、青色 `#81ECEC`（变量 `--cyan`，目前没页面独占）。

### 2.3 字体

```css
body {
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

/* 代码块、字段名 */
.wf, code, .fname {
  font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
}
```

### 2.4 字号

| 用法 | 字号 |
|------|------|
| 正文 | 14px |
| 卡片标题 | 14-15px |
| 次要文字 | 12-13px |
| 表格 | 12px |
| 标签/badge | 11px |
| 最小（脚注、标记）| 10px |

---

## 三、页面结构模板

完整 HTML 骨架，复制即可用。**把 `chatI` 和 "新页面标题" 替换成你的 tab 代号和标题**。

```html
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MSC-I · 新页面标题</title>
<style>
:root {
  /* 复制 §2.1 的完整变量块 */
  --bg: #0D0F14; --bg-card: #161922; --bg-card-hover: #1C1F2B;
  --bg-input: #1E2130; --border: #2A2D3A; --text: #E8E9ED;
  --text-secondary: #9CA0B0; --text-muted: #6B7084;
  --accent: #6C5CE7; --accent-light: #A29BFE;
  --green: #00B894; --green-bg: rgba(0,184,148,.12);
  --amber: #FDCB6E; --amber-bg: rgba(253,203,110,.12);
  --red: #FF6B6B; --red-bg: rgba(255,107,107,.12);
  --blue: #74B9FF; --blue-bg: rgba(116,185,255,.12);
  --gold: #F9CA24; --chain: #00CEC9;
  --radius: 12px; --radius-sm: 8px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg); color: var(--text);
  font-family: 'PingFang SC','Microsoft YaHei','Helvetica Neue',sans-serif;
  line-height: 1.7; -webkit-font-smoothing: antialiased;
}

/* ===== HEADER（nav.js 会自动把它变成 sticky top:0）===== */
.header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 20px; border-bottom: 1px solid var(--border);
}
.header h1 {
  font-size: 15px; font-weight: 700;
  display: flex; align-items: center; gap: 8px; margin: 0;
}
.header .badge {
  font-size: 11px; padding: 3px 10px;
  background: rgba(108,92,231,.12); color: var(--accent-light);
  border: 1px solid rgba(108,92,231,.25); border-radius: 20px;
}
.header .stats {
  display: flex; align-items: center; gap: 14px;
  font-size: 12px; color: var(--text-secondary); flex-shrink: 0;
}
.header .stats span { display: flex; align-items: center; gap: 4px; }
.header .stats .s-a { color: var(--green); }
.header .stats .s-d { color: #fbbf24; }
.header .stats .s-x { color: #f87171; }

/* ===== NAV（nav.js 自动覆盖为 sticky top:52 + 底部高亮线风格）===== */
/* 你这里只需要声明一个容器，样式由 nav.js 注入，不要自己写 .nav a 的样式 */

/* ===== MAIN ===== */
.main { max-width: 960px; margin: 0 auto; padding: 24px 16px 80px; }

.section { margin-bottom: 40px; }
.section-head {
  font-size: 20px; font-weight: 700; margin-bottom: 6px; padding-top: 20px;
}
.section-head .n { color: var(--accent-light); margin-right: 8px; }
.section-sub {
  font-size: 14px; color: var(--text-secondary);
  margin-bottom: 20px; line-height: 1.6;
}

/* ===== CARD（折叠卡片，fb.js 自动处理 onclick="tog(this)"）===== */
.card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius); margin-bottom: 14px; overflow: hidden;
}
.card-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px; cursor: pointer; user-select: none;
  transition: background .15s;
}
.card-head:hover { background: var(--bg-card-hover); }
.card-head.open .card-arrow { transform: rotate(180deg); }
.card-body { display: none; padding: 0 18px 18px; }
.card-body.show { display: block; }
.card-num {
  font-family: 'SF Mono', monospace; font-size: 12px;
  padding: 2px 8px; border-radius: 4px;
  background: rgba(108,92,231,.12); color: var(--accent-light);
}
.card-title { flex: 1; font-size: 14px; font-weight: 600; }
.card-arrow {
  font-size: 11px; color: var(--text-muted);
  transition: transform .2s; flex-shrink: 0;
}
</style>
</head>
<body>

<!-- ===== HEADER ===== -->
<div class="header">
  <h1>MSC-I · 新页面标题 <span class="badge">分类标签</span></h1>
  <div class="stats">
    <span class="s-a">✓ <b id="ca2">0</b></span>
    <span class="s-d">💬 <b id="cd2">0</b></span>
    <span class="s-x">✗ <b id="cx2">0</b></span>
  </div>
</div>

<!-- ===== NAV ===== -->
<div class="nav">
  <a href="#sec1" class="active">I.1 第一节</a>
  <a href="#sec2">I.2 第二节</a>
  <a href="#sec3">I.3 第三节</a>
</div>

<!-- ===== MAIN ===== -->
<div class="main">

<!-- SECTION I.1 -->
<div class="section" id="sec1">
  <div class="section-head"><span class="n">I.1</span>第一节标题</div>
  <div class="section-sub">这节的简要说明</div>

  <!-- 折叠卡片 -->
  <div class="card">
    <div class="card-head" onclick="tog(this)">
      <span class="card-num">I.1.1</span>
      <span class="card-title">卡片标题</span>
      <span class="card-arrow">▼</span>
    </div>
    <div class="card-body">
      <p>卡片内容</p>

      <!-- 反馈块（见 §4.2）-->
      <div class="fb" data-id="i-1-1" data-ver="1">
        <div class="fb-t">CEO 快速反馈</div>
        <div class="fb-btns">
          <button class="fb-b" onclick="sf(this,'a','i-1-1')">✅ 同意</button>
          <button class="fb-b" onclick="sf(this,'d','i-1-1')">💬 需讨论</button>
          <button class="fb-b" onclick="sf(this,'x','i-1-1')">❌ 不同意</button>
        </div>
        <textarea class="fb-n" placeholder="补充说明…" onchange="sn(this,'i-1-1')"></textarea>
      </div>
    </div>
  </div>

</div>

<!-- SECTION I.2 -->
<div class="section" id="sec2">
  <div class="section-head"><span class="n">I.2</span>第二节标题</div>
  <!-- ... -->
</div>

</div><!-- /main -->

<!-- ═══════ 脚本加载顺序必须固定：nav.js → FB_KEY → sb.js → fb.js ═══════ -->
<script src="/nav.js"></script>
<script>window.FB_KEY='msc_i_fb';window.FB_PAGE='chatI'</script>
<script type="module" src="/sb.js"></script>
<script src="/fb.js"></script>
</body>
</html>
```

---

## 四、核心组件

### 4.1 折叠卡片（`.card`）

**标杆**：chatE 的 `.card` 结构。

**HTML 结构**：
```html
<div class="card">
  <div class="card-head" onclick="tog(this)">
    <span class="card-num">I.1.1</span>
    <span class="card-title">卡片标题</span>
    <span class="card-arrow">▼</span>
  </div>
  <div class="card-body">
    卡片内容
  </div>
</div>
```

**展开方式**：
- fb.js 的通用 `tog()` 会同时操作 `.card-head.open`、`.card-body.show`、`.card.open` 三个标志
- **不需要**自己写 toggle 逻辑
- 默认收起；要初始展开加 `<div class="card">` → `<div class="card open">` 并且 `<div class="card-body">` → `<div class="card-body show">`

### 4.2 反馈块（`.fb`）— 必含

每个设计决策点后面都应该有一个反馈块，让 CEO 在网页上直接记录 ✅/💬/❌。

**HTML 结构**：
```html
<div class="fb" data-id="唯一ID" data-ver="1">
  <div class="fb-t">标题（比如"CEO 快速反馈"或"设计决策"）</div>
  <div class="fb-desc">可选的描述</div>
  <div class="fb-btns">
    <button class="fb-b" onclick="sf(this,'a','唯一ID')">✅ 同意</button>
    <button class="fb-b" onclick="sf(this,'d','唯一ID')">💬 需讨论</button>
    <button class="fb-b" onclick="sf(this,'x','唯一ID')">❌ 不同意</button>
  </div>
  <textarea class="fb-n" placeholder="补充说明…" onchange="sn(this,'唯一ID')"></textarea>
</div>
```

**约定**：
- **data-id** 必须唯一（整页范围）。推荐格式：`{页面代号}-{章节}-{序号}`，比如 `i-1-1`、`i-2-3`
- **data-ver**：内容改动时升级（从 `"1"` 到 `"2"`）。升级后旧反馈标记为 outdated
- `sf()` 和 `sn()` 是 fb.js 定义的全局函数，会自动把反馈写入 localStorage + Supabase

**CSS**：
```css
.fb {
  margin-top: 16px; padding: 14px;
  background: rgba(108,92,231,.06);
  border: 1px solid rgba(108,92,231,.15);
  border-radius: var(--radius-sm);
}
.fb-t { font-size: 12px; color: var(--accent-light); font-weight: 600; margin-bottom: 8px; }
.fb-desc { font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }
.fb-btns { display: flex; gap: 8px; margin-bottom: 8px; }
.fb-b {
  font-size: 12px; padding: 6px 14px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--bg-card);
  color: var(--text-secondary); cursor: pointer; transition: all .15s;
}
.fb-b:hover { border-color: var(--text-muted); }
.fb-b.s-a { background: var(--green-bg); color: var(--green); border-color: var(--green); }
.fb-b.s-d { background: var(--amber-bg); color: var(--amber); border-color: var(--amber); }
.fb-b.s-x { background: var(--red-bg); color: var(--red); border-color: var(--red); }
.fb-n {
  width: 100%; background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 6px; padding: 8px 10px; color: var(--text);
  font-size: 12px; resize: vertical; min-height: 36px; font-family: inherit;
}
```

### 4.3 视图过滤标签

每张卡片可以打 `data-tags` 属性，用户能选"只看 CEO 关心的/UI 设计师关心的/工程师关心的"：

```html
<div class="card" data-tags="ceo ui">
  <!-- 这张卡 CEO 和 UI 设计师能看到，工程师不能 -->
</div>
```

**可用的 tag**：`ceo`、`ui`、`eng`。不加 `data-tags` 的卡片在所有视图里都可见。

### 4.4 手机 mockup

站点有一套标准的手机外壳，用来展示 app 界面：

```html
<div class="phone-mockup">
  <div class="phone-frame">
    <div class="phone-notch"></div>
    <div class="phone-screen">
      <!-- 你的界面内容 -->
    </div>
  </div>
</div>
```

完整 CSS 看 chatE.html 里的 `.phone-mockup` / `.phone-frame` / `.phone-notch` 定义，直接复制。

---

## 五、必须遵守的约定

这一节是**踩过的雷**，违反任何一条都可能让页面静默失效。

### 5.1 全局函数名禁区

`nav.js` 和 `fb.js` 会在全局注入这些函数，**新页面不能重新定义它们**，否则会被覆盖（或反向覆盖 nav.js/fb.js）：

```
tog          toggle      toggleAll    toggleCeo    setActive
sf           sn          sel          openRedPkt   resetSlide
startCountdown            _setCardState             _isCardOpen
```

如果你需要自己的折叠/切换函数，**取一个独立的名字**：比如 `modToggle`、`treeToggle`、`panelOpen`（product-spec 就是这样做的，所以它的折叠不受影响）。

### 5.2 不要用 `.summary-bar` 作底部固定 bar

历史上 chatG/H 用 `.summary-bar` 作 sticky 顶部统计栏，chatE/F 又用同名 class 作 fixed 底部统计条。v7.4.3 踩过这个雷——全局选择器打中两种用法，导致 E/F 底部 bar 被拖到顶部盖住正文。

**规则**：新页面统计数字**直接合并进 `.header` 右侧**（见 §3 模板），不创建 `.summary-bar` 元素。

### 5.3 nav href 必须指向真实 id

```html
<!-- 错误 -->
<a href="#nonexistent">I.4.3 不存在的锚点</a>

<!-- 正确 -->
<a href="#sec3">I.3 第三节</a>  <!-- 页面里有 <div id="sec3"> -->
```

v7.4.7 之前，孤儿 link 会让 scroll-spy 的后续所有 tab 错位一个。现在有根因防御，但仍然应该避免写孤儿。

### 5.4 脚本加载顺序（固定）

```html
<script src="/nav.js"></script>
<script>window.FB_KEY='msc_i_fb';window.FB_PAGE='chatI'</script>
<script type="module" src="/sb.js"></script>
<script src="/fb.js"></script>
```

**为什么这个顺序**：
- `nav.js` 最先（注入侧边栏 DOM、全局 CSS、nav 点击/scroll-spy）
- `FB_KEY` / `FB_PAGE` 变量必须在 fb.js 之前定义
- `sb.js` 是 module（Supabase 客户端），异步加载
- `fb.js` 最后（依赖 sb.js 的 Supabase 客户端、nav.js 的 DOM）

### 5.5 `FB_KEY` 命名约定

每个页面有一个 localStorage key 存反馈数据：

| 页面 | FB_KEY |
|------|--------|
| chatA | `msc_ceo_feedback`（历史遗留，不变）|
| chatB | `msc_b_fb` |
| chatC | `msc_c_fb` |
| chatD | `msc_d_fb` |
| chatE | `msc_e_fb` |
| chatF | `msc_f_fb` |
| chatG | `msc_g_fb` |
| chatH | `msc_h_fb` |
| architecture | `msc_arch_fb` |
| product-spec | `msc_ps_fb` |
| **新页面 I** | `msc_i_fb`（推荐）|

**规则**：`msc_{页面小写代号}_fb`。

---

## 六、做新页面的 10 步清单

```
□ 1. 复制 §3 的 HTML 骨架到 chatI.html（或你的文件名）
□ 2. 改 <title>、<h1>、badge 文字
□ 3. 改 body.page-chatX class（通过 nav.js 自动注入，但要确认 CSS 变量里的主色）
     —— 实际上 body class 不用你写，nav.js 自动加 page-chatI
□ 4. 改 nav 的 tab 文字和 href，确保每个 href 指向的 id 在页面里真实存在
□ 5. 写正文的 .section 和 .card 内容
□ 6. 每个设计决策点加 .fb 反馈块，data-id 唯一
□ 7. 改 FB_KEY 为 msc_{代号}_fb
□ 8. 修改 nav.js 的 PAGES 数组，在"商业机制"类目下加一行：
     { href: 'chatI.html', label: 'I · 新页面标题', badge: '新', badgeColor: '#34d399' }
□ 9. 修改 index.html 硬编码侧边栏，同样加一行 <a class="ni" href="chatI.html">...</a>
□ 10. 修改 decisions.html 的 PAGES 数组加一行（让决策面板能聚合到本页反馈）
□ 11. 本地 python3 -m http.server 8081 打开验证：
     - 侧边栏有新 tab
     - nav tab 点击跳转+高亮正常
     - 折叠 open/close 正常
     - 反馈按钮点击后数字会变
     - 查 localStorage 能看到 msc_i_fb
□ 12. git add / commit / push 到 Railway
```

**注意**：第 3 步我写了 nav.js 自动加 body class，但其实 **nav.js 是从当前 URL 解析文件名**来加 class 的（`page-chatI`）。所以文件名必须严格符合规则（`chatI.html`），不然主色匹配不上 `body.page-chatI .nav a.active` 这样的 CSS 选择器。

如果你的新页面不想用 `chatI.html` 这个名字（比如叫 `b2b-platform.html`），就要手动在 nav.js 的主色 CSS 覆盖里加一行：

```css
body.page-b2b-platform .nav a.active {
  color: #你的主色 !important;
  border-bottom-color: #你的主色 !important;
}
```

---

## 七、针对 B 端交易平台（chatI）的具体建议

你说 B2B 页面会另起 chat 讨论细节，这里只写"这份指南怎么指导它"。

- **归属**：商业机制类目下（跟 E/F/G/H 并列），nav.js PAGES 数组加到 "商业机制" items 数组末尾
- **文件名**：建议 `chatI.html`，自动匹配主色 CSS
- **主色**：目前还没独占的颜色有 `--cyan #81ECEC`、粉色 `#FF79C6`、橙色（被产品规格占了但色度不同可考虑）。我建议 **cyan**——它在暗色背景上清爽专业，跟 B 端交易平台的气质贴
- **页面性质（你的原话）**：设计讨论页 + 产品展示。意味着：
  - 既要有 `.fb` 反馈块（设计讨论）
  - 又要有大气的 mockup/数字/商业模式图（产品展示）
  - 两种组件本文档都覆盖了
- **这份文档在方向 2（数据化改造）里的角色**：当 Sean 把内容搬到 Supabase 时，这份文档定义的"HTML 结构"就是 Supabase 里的"**渲染模板约定**"——每种组件（card / fb / section / mockup）在数据库里都有对应的字段结构

---

## 八、本文档的后续维护

- **当站点架构变化时**：更新这份文档的"基准版本"号，加一节 changelog
- **踩到新的坑**：加到 §5 "必须遵守的约定"
- **新的组件类型**：加到 §4 "核心组件"
- **方向 2 启动时**：把这份文档的 HTML 结构约定翻译成 Supabase schema
