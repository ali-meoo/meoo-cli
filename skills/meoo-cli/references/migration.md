# Existing Project Migration

已有项目接入 Meoo 时，不运行 `meoo init`，不重建脚手架。完整读取 `mise-import.md`，分析现有清单、锁文件、构建和启动配置，然后做最小 Mise 适配。

| 项目 | 模式 | 重点 |
|---|---|---|
| 单 HTML / 多 HTML | static | 保留目录与相对资源，补输出根 `index.html`，逐页验证 |
| React/Vue/其他 SPA | static | 保留框架与包管理器，声明真实 build/output，验证路由刷新 |
| Express/FastAPI/SSR/Java/Go | server | dev 收敛到 3015，声明真实 start/生产端口 |

Mise 协议和验证通过后再创建/绑定项目并执行 `meoo sandbox push` 或 `meoo deploy`。旧 `.meoo/config.json runtime`、`--runtime image`、固定 `scripts/setup.sh/start.sh` 均不是新项目的适配目标。
