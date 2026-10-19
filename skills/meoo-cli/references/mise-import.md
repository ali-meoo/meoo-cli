# Meoo Mise 适配规范

本规范仅适用于已选择 Mise 的项目和首次接入的外部 Web 工程，不用于强制迁移标准 React 模板或已有非 Mise 项目。`meoo init` 创建的新全栈模板已配齐协议，不要重复改造；标准静态模板保留原 package scripts。需要适配的工程按本规范支持正式发布和 Sandbox 预览，CLI 不替 Agent 修改业务源码。

## 支持边界

支持单 HTML、多 HTML、SPA、SSR、HTTP API，以及能收敛为一个浏览器入口的全栈项目。保留原技术栈、包管理器、目录和业务代码；只做运行所需的最小适配。必须对外暴露多个独立端口、依赖企业内网/VPC/本机服务或无法提供 HTTP 入口的项目不支持。

## 本地 mise 准备（含中国大陆网络）

先执行 `command -v mise`（Windows 使用 `Get-Command mise`）和 `mise --version`。已有可用版本时直接复用，不重复安装。`mise install` 安装的是项目声明的工具，不会安装 mise 本身。

中国大陆本地 Agent 已有 Node/npm 时，可从 npm 安装官方 `mise` 包到用户目录；以下是 macOS/Linux 示例，不需要 sudo，不会给业务项目添加依赖：

```sh
npm install --prefix "$HOME/.local/share/meoo-mise" mise --registry=https://registry.npmmirror.com
export PATH="$HOME/.local/share/meoo-mise/node_modules/.bin:$PATH"
mise --version
```

这里的 npm 包名是 `mise`，不是旧的 `@jdxcode/mise`。镜像只是下载来源，不保证任何网络都能访问；安装失败时检查报错中的实际下载域名、代理和证书，不能把 registry 请求成功当成二进制安装成功。新命令会话不一定继承 PATH，须再次设置上述 PATH 或使用完整可执行文件路径；不要自动改用户 shell 配置。不要在 `mise.toml` 中加入本机安装路径。

没有 Node/npm 时，macOS/Linux 可使用官方安装器，Windows 可使用 `winget install jdx.mise`：

```sh
mise_installer=$(mktemp)
curl --fail --show-error --location --connect-timeout 10 --max-time 60 https://mise.run -o "$mise_installer" && sh "$mise_installer"
export PATH="$HOME/.local/bin:$PATH"
mise --version
```

若官方来源或已选择的镜像不可达，使用用户已有的网络代理或组织维护的可信镜像；缺少可用来源时明确报告安装阻塞，不反复重试，不使用不明 GitHub 代理，不关闭 TLS/校验和校验。不要因 mise 未安装而改造业务架构或绕过 Mise 门禁。

mise 本体可运行后，再处理项目运行时下载：`mise install` 与 `mise run install` 分别负责工具和业务依赖；npm registry 不控制 Node/Python 二进制下载。Node 官方支持 `MISE_NODE_MIRROR_URL`，中国大陆可在单次命令中尝试：

```sh
MISE_NODE_MIRROR_URL=https://npmmirror.com/mirrors/node/ mise install
```

该设置只影响 Node，不代表 Python、pnpm 或其他工具也会走镜像；保留校验，失败时按日志中的具体工具和 URL 排查，检查项目版本及镜像是否提供该平台制品。不要猜测 Python 镜像环境变量，也不要把本机代理、凭证或未经目标环境验证的镜像写入项目协议。先审阅项目任务；仅在明确提示未信任时对该项目执行 `mise trust --yes ./mise.toml`，不全局关闭信任检查。

安装验收必须包含 `mise --version`、项目 `mise install`、`mise exec -- <项目运行时> --version` 和后续真实 dev/build/start 验证。命令找不到、下载失败、信任失败和项目依赖失败须分别报告。云端 Sandbox 已有 mise 时直接使用；若缺失则报告镜像/平台环境异常，不在沙箱里套用本地 npm 引导安装。

来源：[官方安装文档](https://mise.jdx.dev/installing-mise.html)、[Node 镜像设置](https://mise.jdx.dev/lang/node.html)。

## 根协议

项目根目录必须有 `mise.toml`。所有项目必须声明可执行的 `tasks.dev`，并真实监听 `0.0.0.0:3015`。

纯静态项目不要引入框架或 `package.json`。只有项目根目录全部内容都可公开时才使用 `output = "."`；存在 `.env`、私有配置、源码或其他非公开文件时，必须把公开文件整理到独立输出目录：

```toml
[tools]
python = "3.13"

[tasks.dev]
run = "python -m http.server 3015 --bind 0.0.0.0 --directory ."

[meoo.deploy]
mode = "static"
output = "."
```

需要构建的静态项目增加 `tasks.install`、`tasks.build`，并把 `output` 指向真实产物目录。服务端项目必须声明生产端口和 `tasks.start`；预览端口仍固定为 3015，生产端口可以不同。

```toml
[tools]
node = "22"

[tasks.install]
run = "pnpm install --frozen-lockfile"

[tasks.dev]
run = "PORT=3015 HOST=0.0.0.0 pnpm dev"

[tasks.build]
run = "pnpm build"

[tasks.start]
run = "PORT=9000 HOST=0.0.0.0 pnpm start"

[meoo.deploy]
mode = "server"
port = 9000
```

`scripts/setup.sh`、`scripts/start.sh` 和旧 `.meoo/config.json runtime` 不是平台协议。已有脚本可由 Mise task 复用，但不要为了平台新建固定脚本。不要写死 `/home/project` 或 `/code`。

static 模式必须有相对 `output`，且不能声明发布 `port` 或 `tasks.start`；server 模式必须有合法 `port` 和非空 `tasks.start`，且不能声明 `output`。不要声明已废弃的 `[meoo.preview]`。

## 旧全栈迁移检查表

只在工程明确接入 Mise 时执行；标准 React 老项目及未选择 Mise 的旧项目保留原发布方式，不要为正常 Push/Deploy 强行迁移。

**Mise 构建不会自动执行项目 Dockerfile，也不会自动运行旧 setup.sh/start.sh。** `mise install` 只准备工具，不安装 requirements/package.json 的业务依赖。协议校验通过、镜像构建成功都不代表服务能启动。迁移前读取原 Dockerfile、已有 setup/start 脚本、依赖清单及 CI，逐项记录“旧行为 → 新 task/配置 → 验证结果”，不得只增加 dev/start。

| 对比项 | 迁移与验证要求 |
|---|---|
| 依赖安装 | 将原真实生产依赖入口接入 `tasks.install` 或实际承担安装的 build 任务。例如原来使用 requirements-ci.txt，不要擅自改成含模型大包的 requirements.txt；保留锁文件、系统依赖和必要构建步骤。已有脚本可直接复用，不新增固定脚本协议。 |
| 解释器与路径 | 安装和 dev/start 使用同一解释器；采用 Mise 管理的 Python 时用 `python -m pip` 与 `python -m uvicorn`。不要写死本机 `/usr/local/bin/python3`，也不要用 system 掩盖 Python 版本差异；核对 venv、工作目录、相对路径和产物路径。 |
| 环境与并发 | 保留原脚本/Dockerfile 的业务默认值、超时与线程池设置；不要输出、硬编码或提交密钥。不要把业务线程池 workers 变量误改为 uvicorn `--workers`，或把某个客户的默认值复制到其他项目。 |
| 文件与容器语义 | 检查 Dockerfile COPY 的源码、静态资源、配置是否会被上传，核对 `.dockerignore`、权限、临时可写目录及文件系统约束。密钥应通过安全配置提供，不能为“保留 COPY”直接公开上传秘密文件。 |
| 预览与生产 | dev 对外监听 0.0.0.0:3015；start 监听声明的生产端口，复用原启动行为而非另造假健康响应。验证真实页面、API、资源及必要业务设置。 |

Python 最小示例（仅适用于确认原项目确实使用这些依赖和启动入口的情况；环境默认值仍须逐项对齐原项目）：

```toml
[tools]
python = "3.12"

[tasks.install]
run = "python -m pip install -r requirements-ci.txt"

[tasks.dev]
run = "python -m uvicorn app:app --host 0.0.0.0 --port 3015"

[tasks.start]
run = "python -m uvicorn app:app --host 0.0.0.0 --port 9000"

[meoo.deploy]
mode = "server"
port = 9000
```

在隔离副本、干净环境中执行 `mise install` → 需要时 `mise run install` / `mise run build` → `mise run dev` / `mise run start`，避免复用本机已安装的包掩盖遗漏。不使用客户线上作为试验场；不能完成目标 Linux/镜像或外部业务依赖验证时明确列出边界，不宣称正式发布已修复。

`MISE_DEPENDENCY_SETUP_UNVERIFIED` 只表示依赖安装尚未由 CLI 静态检查确认，不是硬门禁；内置依赖、标准库、预编译产物等可合理没有 install。反过来，声明了 install/build 也不是安装有效的证明，仍需验证。

失败诊断分三层读取：运行线索（例如 No module named uvicorn）、本次提交的 Mise SHA/任务及清单存在性、疑似迁移遗漏。缺模块也可能是解释器/虚拟环境、安装失败、依赖清单或打包排除问题，不能直接认定 TOML 没写 install。对照原配置与构建日志确认后修复。标注为当前线上入口的观察未确认对应本次版本；诊断超时、入口不可达、未获取完整错误时，保留原错误和 traceId，不把“无补充信息”当成成功，不盲目重复 deploy。

## 场景规则

- 单 HTML：保留文件和相对资源结构；若入口不是 `index.html`，在发布目录补一个最小 `index.html` 入口或整理到独立输出目录。
- 多 HTML：保留各页面和子目录结构，确保输出根有 `index.html`，逐个验证所有可导航 HTML 及其 CSS、JS、图片相对路径。
- SPA：保持原框架和包管理器；验证 `tasks.build` 的真实输出、入口文件和刷新/路由策略。
- 全栈：`tasks.dev` 必须在 3015 提供唯一浏览器入口。可以做最小端口或反向代理适配来聚合已有前后端，但不要重写架构；`tasks.start` 必须在声明的生产端口启动真实服务。

## 执行与门禁

1. 读取 README、清单、锁文件、已有脚本、Docker/CI 和端口配置，推导真实 install/dev/build/start 命令。
2. 创建或最小修复根 `mise.toml`；安装、构建、开发和生产启动各自承担单一职责。运行 `node <本 Skill 目录>/scripts/validate-mise-protocol.cjs ./mise.toml`，修复全部错误。
3. 先按“本地 mise 准备”检查或安装 mise，再执行 `mise install`，必要时执行 `mise run install`。
4. 启动最新一次 `mise run dev`，验证 `http://127.0.0.1:3015/` 的真实页面、重定向、iframe 响应头和必要资源；多 HTML 逐入口验证。
5. static：必要时执行 `mise run build`，检查 `output/index.html` 与所有页面资源。server：必要时 build，再执行 `mise run start` 并检查声明的生产端口。验证后停止测试进程。
6. 只有全部通过后才执行 `meoo sandbox push` 或 `meoo deploy`。缺失或不合法时 CLI 返回 `MISE_ADAPTATION_REQUIRED`；旧 runtime 与 Mise 冲突时返回 `RUNTIME_CONFIG_CONFLICT`。

`meoo sandbox push [path]` 可以只上传单个业务文件，CLI 仍会把根 `mise.toml` 作为控制文件一并提交。独立 Push 失败即命令失败；`meoo deploy` 内的 Sandbox 同步失败会明确告警，但正式发布继续。
