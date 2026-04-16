# MSC.AI 内部文档

这个目录存放团队参考文档，不通过网站主导航暴露。

| 文件 | 说明 |
|------|------|
| style-guide.md | 新页面建设指南（v7.4.8 基准）—— 做新 tab 时参考 |

注意：这些文件仍在 Express 静态文件服务的目录树里，
理论上可通过 `/docs/{filename}` URL 访问。我们选择不严格屏蔽
（"不宣传但也不刻意隐藏"）。若将来需要严格屏蔽，改 server.js
加 `app.use('/docs', (req,res) => res.status(404).end())` 即可。
