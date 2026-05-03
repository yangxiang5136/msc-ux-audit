# MSC.AI · 工作 TODO

> Last updated: **2026-05-02** by Codex 「review fixes」
> Maintainer: Sean(co-founder · Product/UX/CTO)
> 用法:任何 AI 工具开场先读 `AI_CONTEXT.md`,再读这个文件和 `changelog.html` 最新版本块,即可对齐当前战场

---

## 🔥 当前焦点

> 这是 *本周* 真正在做的 1-3 件事。其他都是辅助。

1. **消化辛总 13 条反馈,启动 chatJ v7.10 战略再校准** · 核心修正 3 条:GitHub 比喻太小 / 创造 vs 依赖 / B/C 不分述
2. **chatK 交易平台 UI 改版**(待 v7.10 战略定稿后启动)· 含支线 A/B/C 三个 v7.9.0 遗留同步任务
3. **建立反馈永久存档机制** · 解决 Supabase 覆盖写入导致历史反馈丢失的根因问题

---

## 📋 主线任务

### 战略层(chatJ 系列)

- [~] **chatJ v7.10 战略再校准** · 待启动新 chat
  - [ ] 与辛总 30 分钟对齐通话 · 核心修正方向 confirm(可选,推荐先做)
  - [ ] J.0 修正:"创造" → "依赖"双线叙事
  - [ ] J.1 修正:"挣钱的 GitHub" → "AI 时代第三类百万亿资产 · 生存刚需"
  - [ ] J.2 扩展:结算中心加"资产评估神经中枢"职能(辛总 j3)
  - [ ] J.4 重构:反向众包降权,以 AIEO 预知能力为主(辛总 j4)
  - [ ] J.5 强化:A2A 是重点,MCP 砍掉,加 PPM&DM 概念(辛总 j5)
  - [ ] J.7 调整:鸣谢式用"收益表现"替代强制"继承自 X"显示(辛总 j7)
  - [ ] J.8 大改:不细分 B/C,企业作为大号 AI 资产(辛总 j8-pricing)
  - [ ] J.9 重构:C 模式区分"独立创作者(持有)"vs"企业雇员(归公司)" · 加数据安全(辛总 j9 + j9-c-mode)
  - [ ] 整体 prompt 写好后开新 chat 执行
- [ ] **下一阶段战略文档维护** · v7.10 定稿后回到产品战略全景文档同步更新

### UI/UX 层(chatA-H · chatK)

- [ ] **chatK 交易平台 UI 改版** · 战略层定稿后启动
  - [ ] 鹿角茶故事分叉(原"衍生与鸣谢"案例并行 + 新"会员采购+自动配送"案例)
  - [ ] 去股票化 UI(根据辛总 j10 反馈调整)
  - [ ] 反向众包入口(三阶段第一阶段:"帮我做一个类似的"按钮)
  - [ ] 平台作为特殊买家 UI(资产详情页加"原创者:X"小字)
  - [ ] 买断机制替换分成展示
- [ ] **chatF 裂变结构重构** · 辛总有 6 个 ❌ 反馈待消化
  - [ ] 砍掉自媒体涨粉、限制接单、经验值裂变、独立学习模块
  - [ ] 加入"每日活动基金 · 用户来领钱发任务"新粘性模型
- [ ] **支线 A · nav.js 第 28 行加 v7.9.0 entry**(随 chatK 推送一起做)
- [ ] **支线 B · index.html 首页 chatJ 卡片更新**(章节 11→14 · 反馈点 21 · 决策点 4)
- [ ] **支线 C · decisions.html PAGES 数组同步**(加 j0/j6-attribution/j12/j13 · 删 j7-threshold · 验 NULL 处理)
- [ ] **支线 D(新加)· data-ver 属性补全** · 给 chatA-chatH 老 fb 块标记诞生版本号

### 工程层(Railway · Supabase · 小程序)

- [ ] **反馈永久存档机制 · 层级 1**(立即止血)
  - [ ] /feedback-archive/ 目录建立
  - [ ] 今天 (msc-feedback-2026-04-24.json) 作为第一份存档推上去
  - [ ] 制定"每次导出 → 立即归档"流程
- [ ] **反馈永久存档机制 · 层级 2**(主动防御)· 下周再决定做不做
  - [ ] Supabase 改为 append-only feedback_log 表
  - [ ] fb.js 补全所有 fb 块的 data-ver 属性
- [ ] **技术债 · package-lock.json 生成**(让 Dockerfile 改回 npm ci) · 不急
- [ ] **技术债 · server.js 访客追踪并发安全**(visitors.json 改 append-only log) · 不急

### 投资人沟通层

- [ ] **Pre-A 融资节奏推进** · 待战略文档稳定后做对外材料
- [ ] **多语境叙事矩阵实战调用** · v7.10 J.1 定稿后,结合实际 pitch 反馈持续打磨

---

## ⏸️ 阻塞中(等谁/什么)

- **等辛总当面/电话深聊战略修正方向** · 对 j8-pricing(B/C 不分)和 j9(企业数据安全)的具体落地方案需要直接对齐,这两条是世界观级别的修正,不宜单边猜测
- **等 Wang 给最新设计稿** · 去股票化 UI 的具体调整需要看 Wang 的 Figma/Pixso 现状

---

## 🗓️ 短期(本周内)

- [ ] 把今天这份 feedback JSON 归档到 GitHub
- [ ] 启动 v7.10 战略 chat
- [ ] 准备和辛总对齐通话的提纲(基于 13 条反馈)

---

## 📌 长期(背景持续 · 不在本周清单但要记得)

- [ ] AI API 接入 + AIEO 技术实现框架(独立 chat 规划)
- [ ] 鹿角茶故事第二个案例("职场通勤族会员包")的具体设想要 Sean 自己补全
- [ ] CEO 反馈窗口期管理 · 推送新版本后留 1-3 天给辛总点评

---

## 🧊 冷藏(技术债 · 看着办)

- [ ] visitors.json 并发安全(目前流量级别完全 OK · 未来再说)
- [ ] Dockerfile npm install → npm ci(需要先生成 lockfile)
- [ ] msc-style-guide-v7.4.8.md 更新成 v7.8.0+ 实际骨架约定(因为今天发现 style-guide 和源码不一致)

---

## 📝 最近重要决策(滚动 5 条)

- **2026-05-02** · Codex 本地修复 5 个 P1/P2 review finding · 待本地浏览器验证后再决定是否 merge
- **2026-04-28** · 启用 TODO.md 工作流 · 替代记忆碎片化 · 每个 chat 开场 fetch + 结尾 update
- **2026-04-24** · 辛总反馈 13 条到位 · 战略需要 v7.10 重写 · 不是局部调整是世界观修正
- **2026-04-23** · chatJ v7.9.0 上线 · 14 章 · 21 反馈点 · 4 决策点 · 同时修复 fb.js toggle bug
- **2026-04-23** · Railway 部署模式确认为 Node/Express 容器(不是静态托管)· server.js + Dockerfile 已知 · 推送时注意 server.js 防御

---

## 📚 关键参考文档

- **AI 交接入口**:repo 根目录 `AI_CONTEXT.md`(任何 AI 工具先读)
- **多 AI 协作流程**:repo 内 `docs/ai-workflow.md`
- **战略主线**:Claude 项目知识库 → MSC_AI_产品战略全景文档.md
- **项目背景**:Claude 项目知识库 → MSC_AI_项目简报.md
- **chatJ 战略素材**:Claude 项目知识库 → MSC_AI_chatJ_第二批交接文档.md
- **骨架规范**(注意:文档和实际源码有偏差,以最新 chatJ.html 实际骨架为准):Claude 项目知识库 → msc-style-guide-v7.4.8.md
- **Railway 站点**:https://msc-ux-audit-production.up.railway.app/
- **决策面板**:https://msc-ux-audit-production.up.railway.app/decisions.html

---

## 🔄 怎么用这个文档

**每个 AI chat 开场**:
1. 先读 `AI_CONTEXT.md`
2. 再读这个 `TODO.md`
3. 再读 `changelog.html` 最新版本块
4. 如果要改页面骨架,再读 `docs/style-guide.md`

**chat 进行中**:Claude 看到任务进展时,可以建议你"我做完了 X,可以勾掉"或"我们应该加一条 Y"。

**chat 结束**:Claude 给你一份更新后的完整 TODO.md,你扔给 Claude Code 推上去:

```
请把这份 TODO.md 推到 msc-ux-audit repo 根目录。
内容附后:
[TODO.md 全文]

执行步骤:
1. 进入 repo
2. 写入 TODO.md
3. git add TODO.md
4. git commit -m "todo: update from <chat 名称>"
5. git push origin main
```

**任何时候本地查看**:`cd ~/path/to/msc-ux-audit && cat TODO.md`

**集成到你的 progress.sh dashboard**:把 msc-ux-audit 加到监控目录列表 · git log 会显示最新的 todo 更新 commit。
