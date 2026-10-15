# Server Deploy

服务端发布适用于 Express、FastAPI、Next.js SSR、Java、Go 等需要常驻 HTTP 进程的项目。开始工作前必须读取 `mise-import.md`。

- 根 `mise.toml` 使用 `[meoo.deploy] mode = "server"` 和真实生产 `port`。
- 必须声明非空 `tasks.start`；需要安装或构建时分别声明 `tasks.install`、`tasks.build`。
- `tasks.dev` 仍须在 `0.0.0.0:3015` 暴露唯一浏览器入口；内部可保留多个进程/端口并做最小聚合。
- `tasks.start` 在生产端口启动真实服务，健康检查不能由假响应或 stub 通过。
- `scripts/setup.sh`、`scripts/start.sh` 不是必需协议；已有脚本可以从 Mise task 调用。
- 不写死 `/home/project` 或 `/code`，项目内路径使用相对路径。
- 容器文件系统是临时的；持久数据使用外部托管存储。

服务端项目支持 `meoo sandbox push` 和主站 Sandbox 预览。正式发布由 `meoo deploy` 根据 Mise 自动选择 server 链路；旧 `--runtime image` 只用于迁移提示，不再决定执行路径。
