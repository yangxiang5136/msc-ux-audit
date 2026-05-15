# /wxapp/ 微信小程序改稿协作框架 · 工作流文档

> 2026-05-15 创建 · 维护：Sean
>
> 这份文档面向四方协作者：Sean（产出）/ Wang（UIUX）/ 工程师 / 辛总（CEO）。
> 任何 AI 工具改 /wxapp/ 路径前必读。

---

## 一 · 总览

`/wxapp/` 是 msc-ux-audit 站点里独立的一个模块，用于打磨 MSC.AI 微信小程序客户端的 UI/UX。

设计要点：

1. 一次部署到 Railway 后**永久不需要重新部署** —— 所有改稿、批注、评论都走 Supabase 实时写入。
2. 改稿正文用 **Shadow DOM** 隔离，既不污染主页面 CSS，也不被主页面污染。
3. 一条改稿 = 一屏不滚（iOS 375×812 / Android 360×800），长流程拆「分镜组」（flow_group）。
4. 批注用 **SVG 画笔**（自由画笔 / 圆圈 / 箭头 / 矩形）+ 文本 + 表态按钮，所有坐标 0–100 百分比化。
5. 角色身份按 token 自动注入到 `author_role`，四个角色不同笔触颜色。

页面：

- `/wxapp.html` · 改稿列表（缩略图墙 + 状态/作者筛选 + 进度统计）
- `/wxapp-detail.html?slug=...` · 详情页（双设备画布 + 工具栏 + 评论流 + 修订历史）
- `/wxapp-login.html` · token 登录与角色显示

API（全部要 cookie 或 `x-wxapp-token` header · 一般用前者）：

```
POST   /api/wxapp/login            body: { token }    → 200 { role } + Set-Cookie wxapp_session
POST   /api/wxapp/logout                              → 204 + 清 cookie
GET    /api/wxapp/whoami                              → { role }
GET    /api/wxapp/proposals?status=&flow_group=&author_role=
GET    /api/wxapp/proposals/:slug
POST   /api/wxapp/proposals                           body: { slug, title, ... }
PATCH  /api/wxapp/proposals/:slug
POST   /api/wxapp/proposals/:slug/comments            body: { kind, body }
POST   /api/wxapp/proposals/:slug/annotations         body: { shape, svg_path, anchor_x, anchor_y, device, comment, reaction }
DELETE /api/wxapp/proposals/:slug/annotations/:id
```

**认证模型 · 两层防护**：

1. **页面 404 守卫**：访问 `/wxapp.html` 或 `/wxapp-detail.html` 时, 服务端先检查 `wxapp_session` cookie。
   - 无效 / 不存在 → **404**（不是 401）, 外人完全察觉不到沙箱存在。
   - 有效 → 正常渲染。
2. **API token 校验**：每个 `/api/wxapp/*` 接口都过 `requireWxappRole` 中间件，token 从 cookie 或 `x-wxapp-token` header 取，对应不到 4 角色其一就 401。

**Cookie 配置**：HttpOnly + Secure (HTTPS only) + SameSite=Lax + Max-Age 30 天。token 永远不存到前端 localStorage。

---

## 二 · 部署前置（Sean 一次性执行）

### 1. Supabase 跑迁移

打开 Supabase Dashboard → SQL Editor，粘贴 `migrations/wxapp_001.sql` 跑一次。会建 4 张表：

- `wxapp_proposal` · 改稿当前态
- `wxapp_proposal_revision` · 修订历史（append-only）
- `wxapp_comment` · 线性评论流
- `wxapp_annotation` · 批注（含画笔与表态）

迁移自动开启 RLS 但不创建 policy → 默认拒绝所有 anon 直访问 → 只有 service_role（server.js 持有）能读写。

### 2. Railway 配置 4 个角色 token

到 Railway → Variables，新增：

```
WXAPP_TOKEN_SEAN  = <Sean 的 token>
WXAPP_TOKEN_UIUX  = <Wang 的 token>
WXAPP_TOKEN_ENG   = <工程师的 token>
WXAPP_TOKEN_CEO   = <辛总的 token>
```

token 生成命令（Mac 本地终端）：

```bash
openssl rand -base64 24
```

或一行批量生成 4 个：

```bash
for r in SEAN UIUX ENG CEO; do echo "WXAPP_TOKEN_$r=$(openssl rand -base64 24)"; done
```

### 3. git push

```bash
cd ~/msc-ux-audit
git add migrations/ server.js wxapp.html wxapp-detail.html wxapp-login.html wxapp.js wxapp.css docs/wxapp-workflow.md docs/uiux-reference-will.md
git add AI_CONTEXT.md TODO.md
git commit -m "feat: /wxapp/ 微信小程序改稿协作框架 · 一次部署后零重新部署"
git push origin main
```

Railway 会自动触发一次构建，~2 分钟后线上：
https://msc-ux-audit-production.up.railway.app/wxapp.html

### 4. token 分发

Sean 给每个协作者发对应 token 的方式：

- **Wang**：当面 + 飞书私聊片段
- **工程师**：直接私聊 token + 链接
- **辛总**：当面演示登录 + token 卡片

每人登录一次后 token 存浏览器 localStorage，之后免输入。

---

## 三 · 日常工作流

### 3.1 Sean + Claude 创建一条改稿

```
1. Sean 通过 iPhone Mirroring 截一张小程序原图（截屏 skill 见 docs/screenshot-skill.md）
2. Sean 在 Claude 对话窗口贴图 + 描述问题
3. Claude 输出三段：
   - 改稿 HTML（.wp- 前缀 class，无 <script>）
   - 改稿 CSS
   - rationale（Markdown · 解释为什么这么改）
4. Sean 在 /wxapp.html 点「＋ 新建改稿」输入 slug + title
5. 进入详情页点工具栏的 { } / CSS / 📝 / 🖼️ 把内容贴进去
6. 看双设备渲染 OK → 把 status 切到 review
```

### 3.2 Wang（UIUX）微调

```
1. 打开 /wxapp.html，看到一条新「评审中」改稿
2. 进详情页，对样式不满意 → 点 { } 或 CSS 直接改 → 自动生成 revision
3. 觉得某个按钮颜色不对 → 选「圆圈」工具，在画布上圈一下 → 弹窗写「这个绿太亮，用 #34d399 替代」+ 表态 idea → 保存
4. 用「采纳」表态在评论里说「方向 OK，HTML 已微调」
```

### 3.3 工程师评估实现复杂度

```
1. 看到 review 状态的改稿，进详情页
2. 评论流写：「实现 1 天 · 需要后端新接口 GET /assets/:id/pricing」 + kind=note
3. 如果遇到技术阻塞 → kind=block + 说明
```

### 3.4 CEO 拍板

```
1. 在 decisions.html 看本周小程序改稿待决（未实现，见「未来工作」）
2. 进具体改稿，看左侧画稿 + 右侧评论 + rationale
3. 在评论流写一句战略意见 → 切 status 到 accepted 或 rejected
```

### 3.5 工程师完成开发

```
1. 把 accepted 改稿切到 shipped + 评论里贴 commit hash 或 PR 链接
2. 决策面板自动归档到「已开发」桶
```

---

## 四 · Claude 输出改稿正文的约定

任何 AI 工具（包括 Claude / Codex / Claude Code）在为 /wxapp/ 写改稿正文时必须遵守：

1. **HTML class 必须 `.wp-` 前缀**。Shadow DOM 已经隔离，但保持前缀约定方便未来重构。
2. **不能有 `<script>` 标签**。所有交互行为用 CSS-only 实现（`:hover` / `:checked` / `details/summary` / `:target`）。
3. **图片走 https URL 或 base64 data URI**，不要本地相对路径。base64 适合小图标（< 20KB）。
4. **软上限**：HTML 8KB · CSS 4KB。超出说明这屏装不下要拆分镜（同 flow_group 多条改稿）。
5. **微信生态默认样式约定**：
   - 背景色 `#f6f7f9`（微信浅灰）
   - 文本主色 `#1a1a1a`
   - 强调蓝 `#576b95`（微信链接蓝）
   - 强调绿 `#07c160`（微信品牌绿）
   - 字体已经在 base CSS 里设置 PingFang SC / Microsoft YaHei，不要再覆盖
6. **设备适配**：可以用 `:host([device="android"])` 或在外部容器读 `--wp-device` 做条件分支，但首选「写一套兼容俩」。

---

## 五 · 参考资料

### 5.1 Will 的 UIUX 设计理念参考

详见 `docs/uiux-reference-will.md`。

**三条核心 takeaway**：

1. **Truncated Pyramid（截断金字塔）模型**适合公式定价披露：首屏给资产估值、周/月/买断三档显示价、关键 5% 抽佣，下方折叠完整解释。
2. **反 dark pattern vs 反羊毛工程的张力**：合规摩擦（设备指纹/实名）要「明牌化」，前置披露 + 自主性框架来包装，否则会被用户感知为黑产手法。
3. **西方桌面偏置不适用微信生态**：Hamburger 菜单、Cookie 横幅、Liquid Glass 材质等果断舍弃，把视觉预算让给微信原生信任锚（公众号矩阵 / 视频号 / 企业微信）。

### 5.2 现有反馈系统作为参照

`/wxapp/` 故意不复用 `fb.js` 那套 `a/d/x` 三态选择器，因为：

- fb 是「赞同 / 反对 / 不决」三态，语义在战略讨论
- wxapp 是「采纳 / 拒绝 / 阻塞 / 想法」四态，语义在产品决策

两套数据完全隔离，但 decisions.html 可以同时聚合（未来工作）。

---

## 六 · 未来工作

- [ ] decisions.html 加 tab 「小程序改稿决策流」
- [ ] `npm run archive:wxapp` · 改稿快照永久存档（参考现有 `archive:feedback`）
- [ ] Markdown 编辑器替换简陋的 prompt() 输入（Sean 体验优化）
- [ ] 缩略图自动生成：新建改稿时自动截一张 Shadow DOM 渲染的 PNG 存到 `original_image_url` 备用字段
- [ ] AI 提案区：在详情页加一个「让 Claude 再生成一版」按钮直接调对话 API（需要 Claude API key 落到 env vars）
