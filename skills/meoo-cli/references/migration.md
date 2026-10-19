# Existing Project Migration

已有标准模板及非 Mise 项目保留原链路，不强制迁移。首次接入的外部工程不运行 `meoo init`，不重建脚手架；完整读取 `mise-import.md`，分析实际清单、锁文件、构建和启动配置后做最小适配。新 init 全栈模板已带好 Mise，不需用户手工补配置。

| 项目 | 模式 | 重点 |
|---|---|---|
| 单 HTML / 多 HTML | static | 保留目录与相对资源，补输出根 `index.html`，逐页验证 |
| React/Vue/其他 SPA | static | 保留框架与包管理器，声明真实 build/output，验证路由刷新 |
| Express/FastAPI/SSR/Java/Go | server | dev 收敛到 3015，声明真实 start/生产端口 |

Mise 协议和验证通过后再创建/绑定项目并执行 `meoo sandbox push` 或 `meoo deploy`。旧 `.meoo/config.json runtime`、`--runtime image`、固定 `scripts/setup.sh/start.sh` 均不是新项目的适配目标。

旧全栈项目选择接入 Mise 时，必须执行 `mise-import.md` 的“旧全栈迁移检查表”：对照 Dockerfile/setup/start 保留安装、环境、资源与启动行为，并在干净环境验证；不要仅因 dev/start 协议合法就发布。尚未选择 Mise 的旧 React/全栈项目不因此强制迁移。
