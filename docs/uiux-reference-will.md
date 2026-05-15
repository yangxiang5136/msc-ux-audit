# Will 项目 · UIUX 设计理念参考

> 来源：Notion 中 Will（firecracker.will@qq.com，about: [firecracker.cc](http://www.firecracker.cc)）所有的设计知识库。最具代表性的顶层根页面：
> - [NNGroup Topics](https://www.notion.so/1f8886bc60ff80a88ccfd9227144c182)（NN/g 系核心方法论与设计模式总库）
> - [Apple Design](https://www.notion.so/20f886bc60ff81f3af10d35ea8fd2a38)（135 篇，按理念→原则→策略→指南→模式→方法分层）
> - [Laws of UX 2.0](https://www.notion.so/236886bc60ff814dbcd2c44af884dddd)（心理学法则集）
> - [AI-UX interactions](https://www.notion.so/1f8886bc60ff81d49f35f1cc4008d9f6)（7 大趋势 / 24 种 AI 模式 / 50 案例）
> - [Global Product Reference](https://www.notion.so/2e1886bc60ff81fe9012cb20e2c1bfed)（265 类 4000+ 全球产品对标）
>
> 抓取时间：2026-05-14
> 用途：为 MSC.AI 微信小程序打磨提供主流 UIUX 参考；非教条，因地制宜。

---

## 一 · 项目概览

Will 的 Notion 工作空间是一座**「主流 UIUX 设计理念的标准图书馆」**——以 NN/g（Nielsen Norman Group）的方法论为骨架，叠加 Apple HIG / Google Material / Laws of UX 等业界共识，再加上他自己关于 AI 时代 UX 趋势的整理。它不是单一观点项目，而是一份**「全球数字产品 UX 设计公认正确答案」的索引**，覆盖：UX 基础、研究方法、可用性测试、设计模式（表单/导航/弹窗/空状态/onboarding/loading/错误处理）、视觉设计（排版/网格/色彩/层级）、说服性设计（信任 / 心智模型 / 信息觅食）、可访问性、AI-UX 交互（对话式 / Agent / 多模态）、跨文化本地化（含中国市场）等。

对 Sean 的提醒——Will 这套体系代表了**「现代 SaaS / 消费应用的主流设计共识」**，非常适合作为「锚」；但它有强烈的 NN/g 偏置（西方电商、桌面 Web 经验更重）、对中国微信生态深度交互的覆盖较浅。所以下面的分类要按 MSC.AI 的特殊性（公式定价 + C 端 + 中国 + 反羊毛）严格切分。

---

## 二 · Will 的核心设计理念（按重要性排序）

**1. 「你不是用户」——决策必须基于观察，而非创始人直觉**
Will 把这条放在 [UX Slogan #1](https://www.notion.so/1f8886bc60ff81c8a49ec89b00cafe5a) 的位置，引用 1993 年 Nielsen《Usability Engineering》："Users are not Designers, Designers are not Users." 他强调：仅靠询问用户"你想要什么"得不到好设计；用户回答的是他们能想象的、不是真实需要的——必须**通过观察用户完成真实任务**来推导需求。配套理念：[Show Me the Data](https://www.notion.so/1f8886bc60ff814fada9d5db599d0a94)、[If You're Not Checking, You're Guessing](https://www.notion.so/1f8886bc60ff81b99cd0e9df2016557d)。

**2. 「Keep It Simple」但不等于功能缺失——警惕 Featuritis（功能堆砌症）**
[Keep It Simple](https://www.notion.so/1f8886bc60ff816f8763d948e124c25a) 强调可用性（Usability）和实用性（Utility）双轴平衡。Will 引用经典曲线：**产品早期加功能净收益高，后期加功能净收益为负**——因为每个新元素都会增加扫描成本、误用风险、学习成本。这条与 [Hick's Law](https://www.notion.so/249886bc60ff8012a9a3cb83953aacc6)、[Occam's Razor](https://www.notion.so/236886bc60ff8130a07eefd6eb963005)、[Tesler's Law](https://www.notion.so/249886bc60ff80899f15c8e0e61475e2) 联动。

**3. 「自主性 = 选择」——绝不把用户像牛一样赶进单一路径**
[Three Methods to Increase User Autonomy](https://www.notion.so/1f8886bc60ff81debb04f8fb16ead108) 是 Will 体系里最有伦理立场的一篇。他直接引用《加州隐私权法案》对 dark pattern 的定义——"设计用以实质性削弱用户自主性、决策能力或选择的界面"。三个方法：①定制化（颜色 / 视图 / 快捷键），②可扫描性（标题 / bullet / 表情），③时序自由（允许跳过 onboarding、自选学习顺序）。反例：Cappella 强制留资才能看课程详情。

**4. 「Brevity is Brilliance」+ Truncated Pyramid——先给答案，再按需展开**
[Less Chat, More Answer](https://www.notion.so/356886bc60ff81bd8275f6db39edf894) 是 Will 对 AI 对话式产品最锋利的一篇评论："A longer answer was not a better answer." 他提出**截断金字塔模型**：网页解决"怎么排信息"（重要在前但全给），聊天机器人要解决"什么时候给信息"（按需分发）。配套原则：去掉"Great question!"等寒暄；先给具体数字/列表，再问要不要展开；做不到就直说，**别把"不能做"埋在第二段**。

**5. 「Persuasion 不是 Deception」——劝导可以，欺骗不行**
[Deceptive Patterns in UX](https://www.notion.so/1f8886bc60ff81529459d88a3d1a9b2f) + [Persuasive Design](https://www.notion.so/1f8886bc60ff80eea4bbe1b6667516ab) 双向对照。Will 接受锚定、社会认同、稀缺性、互惠原则等说服性手段，**前提是信息真实**。判断红线："用户是否可能无意中花了更多钱、泄露了更多信息？""拒绝按钮是否会让用户感到羞愧或内疚？"亚马逊 Prime 取消难、Booking.com 隐藏负面评价被列为反面教材。

**6. 信任靠四件事：设计质量 + 透明披露 + 内容完整 + 外部链接**
[Trustworthiness in Web Design](https://www.notion.so/1f8886bc60ff8130bd20ef2d857b3e50) 整理 Nielsen 1999 年的可信度四因素，至今未变：①设计干净专业、无错别字、视觉品牌一致；②**前置披露价格、政策、联系方式，不要藏在表单后面**；③内容覆盖全过程而非只有结果；④引用外部独立评价而非孤立网站。注意 #2 与 MSC.AI 公式披露的强相关。

**7. AI 产品要承担"诚实代价"：透明、可关、可纠错、可独立**
[ProductsAI Guidelines](https://www.notion.so/1f8886bc60ff81f8ba2bdf6c65d28bef) 把 AI 功能分四类——Trap doors（数据陷阱）、Vitamins（趣味）、Augmenters（增效）、Access enablers（无障碍）——并给出 10 项设计准则。核心几条：①避免暗模式；②AI 不应成为完成任务的唯一路径（基础功能必须不依赖 AI）；③用户可手动修正 AI 输出；④提前告知 AI 局限。这一条对"AI 匹配雇主和接单者"的 MSC.AI 至关重要。

---

## 三 · 适用 MSC.AI 的部分（强匹配 + 中等匹配）

**【强匹配 1】Truncated Pyramid → 资产估值披露页**
Will 关于"先给答案，再按需展开"的模型完美贴合 MSC.AI 的核心披露场景。雇主／租用者打开任意资产卡片，第一屏必须立刻给出：「估值 ¥X · 周租 = 3.5% × ¥X = ¥Y · 月租 = ¥Z · 买断 = ¥W」**四个数字 + 一行公式**，再放可展开的"估值依据""历史交易""撤销定价"等长信息。当前如果做成"先解释估值算法、再给数字"，就是 Will 批评的 Mississippi chatbot 错误。

**【强匹配 2】Trustworthiness 四要素 → 反羊毛与合规视觉化**
Will 强调"前置披露价格、政策、联系方式"。MSC.AI 必须把：①每一笔抽佣的 5% 比例、②设备指纹与实名手机号采集说明、③争议处理通道、④押金/保证金规则——**全部前置到首次进入交易流程的视野内**，而不是埋在「我的-设置-条款」里。这同时回应了《消保法实施条例》对自动续费的红线。

**【强匹配 3】AI Guidelines #6「核心功能独立」→ AI 匹配兜底**
Will 主张"基础功能不依赖 AI"。MSC.AI 的雇主发任务→AI 匹配→交付，如果 AI 推荐失败，必须保留"人工搜索 / 直接联系"通道。永远给一个不依赖算法的备用路径——这同时是反羊毛的副产品（黑产无法操控人工流程）。

**【强匹配 4】UX Slogan #14「It Depends」+ #1「你不是用户」→ 灰度发布与真实用户测试**
Will 把"视情况而定"列为合法答案。MSC.AI 是新品类（公式定价 AI 资产交易），团队对 Android 中低端机 + 微信生态熟手的真实行为没有先验。落地动作：先用 100-500 个真实雇主跑闭环，**录屏 + 漏斗 + 一对一访谈**，再优化 UI，而不是关起门打磨。

**【中等匹配 5】自主性三方法 #2 可扫描性 → 资产列表与任务卡片**
Will 推崇 Morning Brew 用 bullet + 加粗 + 表情符号让用户 3 秒扫完。MSC.AI 的资产列表 / 任务列表必须满足：①标题 ≤14 字；②价格 / 周期 / 评分三个数字加粗居右；③用 emoji（🔥 热门 / ✅ 已认证 / ⚡ 急单）区分类型，**而非彩色色块**——这在中低端 Android 上更省 GPU 且与微信生态视觉惯例一致。

**【中等匹配 6】Persuasive Design 之 Social Proof + Hierarchy of Trust → 资产页可信度**
Will 接受社会认同与锚定。MSC.AI 资产卡片可以展示"近 7 天 23 单成交""98% 雇主满意"——**前提是数据真实可验证**。但要避开 Booking.com 那种"隐藏负面评价"的轻度欺骗——差评必须和好评同屏可见。

**【中等匹配 7】Liquid Glass 中的"同心几何"+ 胶囊形状 → 移动端按钮规范**
Will 收录的 [Liquid Glass](https://www.notion.so/20f886bc60ff815abffec6b8aeed119a) 提到：**胶囊形状最适合触屏点击，但桌面应只用在最重要的按钮**。MSC.AI 小程序是纯触屏 + 单手大拇指操作，主行动按钮（"立即租用""我要接单"）用胶囊全宽；次级用圆角矩形；同一卡片内圆角与父容器同心。

---

## 四 · 需要因地制宜调整的部分（潜在冲突点）

**【冲突 1】Will 主张「Customizations 提升自主性」 vs MSC.AI 的「冷启动用户认知带宽极低」**
Will 引用 Facebook Messenger 让用户自选聊天主题色作为正面案例。但 MSC.AI 的 C 端用户首次进入要在 90 秒内理解"公式定价 + 资产分类 + 抽佣"三层心智模型——此时再加"自定义皮肤 / 自选首页布局"会**直接耗光认知预算**。
**调整方向**：v1 砍掉所有非任务关键的定制项；只保留一个开关——"显示 ¥ 还是 元"——其余等用户首单完成、留存稳定后再开放。

**【冲突 2】Will 的 NN/g 体系偏向「告别 dark pattern」 vs MSC.AI 反羊毛工程需要的「行为风控摩擦」**
Will 引用加州隐私权法案谴责一切削弱用户自主性的设计。但 MSC.AI 的反羊毛 ROI 是 14 倍工程，**设备指纹采集、实名手机号验证、行为画像分层放行**这些是必要摩擦——黑产眼里它们就是"dark pattern"。
**调整方向**：把摩擦明牌化——所有风控动作必须**对用户透明且可解释**（"我们需要短信验证以防止羊毛党，这与你享受的优惠直接相关"），主动援引 Will 推崇的"前置披露"，把合规摩擦包装为信任锚而不是隐藏成本。

**【冲突 3】Will 的「More Choices, More Trouble」（UX Slogan #12）vs 中国用户的「选择即权力」直觉**
Will 引用 Hick's Law 主张减少选项。但中国微信生态用户长期被「九宫格首页」「订单中心 12 个 tab」训练，**过度精简反而让他们怀疑"功能不全 = 平台不专业"**。Bose 中文站案例（低密度被识别为奢侈品而非购物地）就是这个现象。
**调整方向**：首页主路径精简（≤5 个主按钮），但**"我的"页面密度可以适度高于 NN/g 标准**——参考拼多多 / 闲鱼 / 美团而非 Airbnb / Uber。允许一定信息密度作为"专业感"的视觉代价。

**【冲突 4】Will 的 AI 对话式偏好「Less Chat, More Answer」vs MSC.AI 雇主-接单者的「需求模糊期」**
Less Chat 模型在用户**已知道自己要什么**时最优。但 MSC.AI 雇主发任务时大概率是模糊需求（"我想做个能识别发票的小工具"——预算？周期？技术栈？）。直接给"最终答案"会让 AI 匹配崩盘。
**调整方向**：分两阶段——「需求澄清阶段」允许 AI 用结构化追问（最多 3 个），「方案推荐阶段」严格遵守 Truncated Pyramid（先给 3 个匹配结果 + 估算价 + 工期，再让用户深入看）。

**【冲突 5】Will 的「Localization > Translation」+ 跨文化 6 维度 vs MSC.AI 是单一中国市场**
Will 的 [跨文化设计](https://www.notion.so/1f8886bc60ff810f88dcd3e09148a146) 整理得很好，但是面向**跨境 / 全球品牌**的方法论。MSC.AI 单一市场不需要做跨文化适配，但可以反过来用——**主动拥抱中国本地化深度**：微信登录优先于手机号 OTP；支付宝/微信支付为唯一支付通道；二维码作为信任锚；客服入口接通"企业微信"而不是 in-app chat。这条不是放弃 Will 的方法，而是把跨文化矩阵中"中国维度"的权重拉到 100%。

---

## 五 · 不适用的部分（果断舍弃）

**【舍弃 1】Will 重点收录的「桌面 Web 信任要素」**——例如 [Trustworthiness](https://www.notion.so/1f8886bc60ff8130bd20ef2d857b3e50) 里讲的"显眼的联系方式 / 关于我们 / 实体地址照片"、Footer 设计、面包屑导航。微信小程序无 footer、无传统导航条、用户对"联系方式""企业地址"几乎不查——他们用「企业微信认证」「视频号绑定」「公众号关联」作为信任锚。把页面预算花在公众号/视频号入口而非"关于我们"。

**【舍弃 2】所有讲 Hamburger Menu / Mega Menu / Mobile Subnavigation 的页面**——MSC.AI 小程序原生只有 tabBar（≤5 个），不应模仿网页或 RN App 的多级菜单。Will 的导航库（[Hamburger Menu Guide](https://www.notion.so/239886bc60ff80d296edff5f9a85acb3)、[Mobile Subnavigation](https://www.notion.so/1f8886bc60ff8124a58ddb793540443f)）对当前阶段无用。

**【舍弃 3】Cookie Permissions / Passwordless OTP 等欧美合规设计模式**——中国合规框架不同（《个保法》《消保法实施条例》），照搬 GDPR 风格的 Cookie 同意条会让用户困惑且不必要。MSC.AI 应直接落地"个人信息收集清单 + 一键撤回 + 注销账户"的中国合规标准范式，参考微信「设置-隐私」原生形态。

**【舍弃 4】Glassmorphism / Skeuomorphism / Liquid Glass 的复杂材质效果**——这些 Apple HIG 的视觉趋势在 Android 中低端机上**渲染开销大、掉帧明显**。MSC.AI 应用扁平 + 1-2 dp 阴影 + 单色块，对齐微信原生组件库（WeUI），把性能 budget 留给加载速度和反羊毛的设备指纹采集。

---

## 六 · 落地动作清单（立刻在 /wxapp/ 改稿流程执行）

1. **「公式定价披露模块」改版**：把资产卡片首屏改为 Truncated Pyramid 结构——第一屏强制显示「估值 ¥X · 周租 3.5%×X=¥Y · 月租 10%=¥Z · 买断 30%=¥W」四数字 + 一行公式说明；折叠所有解释性长文。引用：[Less Chat, More Answer](https://www.notion.so/356886bc60ff81bd8275f6db39edf894)。

2. **「反羊毛摩擦明牌化」文案 + 弹窗规范**：所有风控动作前置一句话解释——"为防止羊毛党刷单，此处需短信验证 / 设备授权 / 实名核验"。同时在「我的-账号安全」开放"查看我的风险等级"入口，让用户主动了解风控为何存在。引用：[Trustworthiness](https://www.notion.so/1f8886bc60ff8130bd20ef2d857b3e50) + [Three Methods to Increase User Autonomy](https://www.notion.so/1f8886bc60ff81debb04f8fb16ead108)。

3. **「AI 匹配兜底通道」必须保留**：在「发布任务」结果页底部固定显示"AI 暂未找到合适接单者？→ 改为人工筛选 / 直接邀请"双入口。引用：[ProductsAI Guidelines](https://www.notion.so/1f8886bc60ff81f8ba2bdf6c65d28bef) 准则 6。

4. **「v1 砍定制 + 高信任密度首页」UI 规范**：删除当前所有皮肤 / 排序自选 / 卡片密度切换选项；首页改为单列瀑布流 + 强加粗价格 + emoji 标签。「我的」页可适度高密度（参考闲鱼/拼多多），不要追求 Airbnb 那种留白。引用：UX Slogan #2 + [跨文化设计](https://www.notion.so/1f8886bc60ff810f88dcd3e09148a146) 中国维度。

5. **「100 人闭环可用性测试」立项**：在 v1.0 发布前完成 100 个真实雇主 + 100 个接单者的录屏 + 漏斗 + 半结构化访谈，重点观察：①公式定价是否被理解（看完后能否复述周/月/买断价）；②首单是否能不求助完成；③风控摩擦点会引发多少流失。引用：UX Slogan #1「你不是用户」+ #15「Show Me the Data」。

---

*本文由 Sean 委托抓取整理，原始 Notion 仅可在 Will 的工作空间访问，Sean 需保留访问权限以验证引用。任何与上述「因地制宜调整」不一致的执行决策，请先在 `TODO.md` 记录冲突点并复盘。*
