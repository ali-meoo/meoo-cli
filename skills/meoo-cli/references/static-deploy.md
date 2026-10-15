# Static Deploy

静态发布适用于单 HTML、多 HTML、SPA 和“前端 + Meoo Cloud/Edge Functions”。权威运行与发布协议是根 `mise.toml`；开始工作前必须读取 `mise-import.md`。

- Sandbox：`mise run dev` 必须监听 `0.0.0.0:3015`。
- 正式发布：`[meoo.deploy] mode = "static"`，`output` 是项目内真实静态目录。
- 有构建步骤时声明并验证 `tasks.build`；原始 HTML 就是产物时可省略 build。
- 输出根必须有 `index.html`。多 HTML 保留层级和相对资源关系并逐页验证。
- 不要为纯 HTML 引入框架或包管理器。
- SPA 根据 CDN 能力使用 hash 路由，或确保项目本身具备可用的静态回退方案。

`meoo deploy` 默认先同步源码供主站预览，再发布 Mise 声明的静态目录。`--skip-push` 只跳过 Sandbox，不改变正式发布；不要把预览为空视为正常完成。
