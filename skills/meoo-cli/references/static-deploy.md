# Static Deploy

静态发布适用于单 HTML、多 HTML、SPA 和“前端 + Meoo Cloud/Edge Functions”。标准静态模板和已有非 Mise 项目使用原 package scripts 与 dist/build/out，不要求新增 Mise。仅已选择 Mise 或首次接入的外部工程读取 `mise-import.md` 并采用以下协议。

- Sandbox：`mise run dev` 必须监听 `0.0.0.0:3015`。
- 正式发布：`[meoo.deploy] mode = "static"`，`output` 是项目内真实静态目录。
- 有构建步骤时声明并验证 `tasks.build`；原始 HTML 就是产物时可省略 build。
- 输出根必须有 `index.html`。多 HTML 保留层级和相对资源关系并逐页验证。
- 不要为纯 HTML 引入框架或包管理器。
- SPA 根据 CDN 能力使用 hash 路由，或确保项目本身具备可用的静态回退方案。

`meoo deploy` 默认尝试同步源码供主站预览，再按项目策略发布静态目录（标准项目的 dist/build/out 或 Mise output）。Push 失败应明确告知，但不改变正式发布结果；`--skip-push` 只跳过 Sandbox。不要把预览为空报告为预览成功。
