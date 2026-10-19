# Server Deploy

服务端发布适用于 Express、FastAPI、Next.js SSR、Java、Go 等需要常驻 HTTP 进程的项目。新 `meoo init` 全栈模板已自带完整 Mise 配置；已有非 Mise 项目保留旧 runtime/image 发布，不强制迁移。首次接入的外部工程或主动接入新预览时读取 `mise-import.md`，遵守以下 Mise 协议。

- 根 `mise.toml` 使用 `[meoo.deploy] mode = "server"` 和真实生产 `port`。
- 必须声明非空 `tasks.start`；需要安装或构建时分别声明 `tasks.install`、`tasks.build`。
- `tasks.dev` 仍须在 `0.0.0.0:3015` 暴露唯一浏览器入口；内部可保留多个进程/端口并做最小聚合。
- `tasks.start` 在生产端口启动真实服务，健康检查不能由假响应或 stub 通过。
- `scripts/setup.sh`、`scripts/start.sh` 不是必需协议；已有脚本可以从 Mise task 调用。
- 不写死 `/home/project` 或 `/code`，项目内路径使用相对路径。
- 容器文件系统是临时的；持久数据使用外部托管存储。

旧 image 项目接入 Mise 时，完整执行 `mise-import.md` 的“旧全栈迁移检查表”，不是只补 dev/start。Mise 构建不会自动执行项目 Dockerfile/旧脚本；原依赖安装、系统依赖、环境默认值、资源 COPY 和解释器选择都须逐项接入与验证。`MISE_DEPENDENCY_SETUP_UNVERIFIED` 是非阻塞风险告警，不能替代干净环境启动验证。部署失败时结合终端/JSON 的运行线索、提交配置快照和发布 traceId 排查；未验证版本的线上入口观察不能当成本次构建的确定根因。

Mise 服务端项目支持 `meoo sandbox push` 和主站 Sandbox 预览，`meoo deploy` 根据 Mise 自动选择 server 链路。已有非 Mise 全栈项目仍可用原 `--runtime image` 或保存的 runtime 发布，不强制迁移；只有接入 Mise 后，旧 runtime 才作为兼容校验和废弃提示，不再覆盖 Mise。
