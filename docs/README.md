# MSC.AI 内部文档

这个目录存放团队参考文档，不通过网站主导航暴露。

| 文件 | 说明 |
|------|------|
| style-guide.md | 新页面建设指南（v7.4.8 基准）—— 做新 tab 时参考 |
| ai-workflow.md | 多 AI 协作工作流：开场读取、版本同步、交接规范 |
| architecture-understanding.md | Codex 对网站架构的理解，供 Claude/原规划 AI 审阅纠偏 |
| ai-dialogue.md | Codex 与 Claude 等 AI 工具的异步对话协议和记录 |
| project-memory-layer-reference.md | 可迁移到其他项目的 Project Memory Layer 参考架构 |
| project-memory-layer-localization.md | 将 Project Memory Layer 本地化到本 repo 的对比和适配建议 |

另见 `scripts/agent-bootstrap`：新 AI 工具进入 repo 时可先运行它，获得
git 状态、当前目标、阻塞项、关键文档、架构入口和高风险区域的只读快照。

注意：这些文件是内部参考资料。生产服务已在 `server.js` 屏蔽
`/docs/*` 访问，避免内部规范和项目上下文被公开暴露。
