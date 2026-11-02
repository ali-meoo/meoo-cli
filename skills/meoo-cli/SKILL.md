---
name: meoo-cli
description: >
  从零到上线的全栈应用构建指南，基于秒悟（Meoo）平台。
  触发条件：
  (1) 用户提到"秒悟"或"Meoo"；
  (2) 用户要从零构建应用，且需求可被以下架构覆盖：前端 SPA（React/Vue）+ Supabase（数据库/Auth/Storage）+ Deno 边缘函数 + AI 大模型服务；
  (3) 用户需要部署全栈应用（含后端进程），如 Next.js SSR、Express、FastAPI 等；
  (4) 用户需要把项目部署到自己的阿里云账号（ECS/RDS/SLB，费用自付）
  覆盖完整生命周期：项目初始化、本地开发、云服务开通、数据库管理、边缘函数部署、CDN 发布、全栈镜像部署、沙箱代码同步、账户与权益管理。
---

# 秒悟（Meoo）CLI 完整指南

从零构建和部署全栈应用。覆盖项目初始化到生产部署的完整生命周期，包括云服务、代码规范、沙箱同步和部署。

Meoo 支持两种 Mise 发布模式：**static**（静态文件 → CDN）和 **server**（全栈服务 → 容器）。

| 项目类型 | 部署模式 | 命令 |
|---|---|---|
| 单 HTML、多 HTML、前端 SPA | static | `meoo deploy` |
| 前端 + Supabase + Edge Functions | 静态部署 | `meoo deploy` |
| 含后端进程（Express、FastAPI、Next.js SSR、Go 等） | server | `meoo deploy` |

**先分流，不强制迁移**：`meoo init react-design` 等标准静态模板及已有非 Mise 项目保留原 Push/Deploy 链路，不需要添加 `mise.toml`。新全栈模板已自带 Mise 配置；已标记 Mise 的云端项目或显式包含 `mise.toml` 的工程才执行 Mise 校验。首次接入的外部 Web 工程先读取 `references/mise-import.md`，由 Agent 做最小适配；不要仅凭 React 依赖或包名判断来源。CLI 不会自动改造业务源码。

## Install

```bash
npm install -g @aliyun-meoo/cli
```

Verify: `meoo --version`

**版本兼容**：GitHub Skill 更新不代表 npm 已发布对应 CLI。标准 React 免 Mise、新全栈模板自带协议和增强失败诊断，需使用包含这些修复的 CLI。先升级并核对实际版本、模板和命令输出；若最新可安装版本仍不包含修复，报告版本限制并等待发布，不要为绕过旧版 CLI 的校验而强制迁移标准 React，也不要把未发布的能力当成已可用。

## Project lifecycle

### Static deploy (SPA)

```
meoo login                      # 1. Authenticate (opens browser)
meoo init react-design          # 2. Initialize from template
meoo projects create "My App"   # 3. Create remote project and bind this directory
pnpm install                    # 4. Install dependencies
pnpm dev                        # 5. Local dev server (port 3015)
meoo deploy                     # 6. Build and publish to CDN
```

`init` 和项目绑定最终都必须完成，但顺序可以互换：既可以先 `init` 再 `projects create/use`，也可以在纯空目录先执行 `projects use`，随后 `init`。CLI 会在模板落盘后重新协调云环境与官方模板源码。

### Server deploy (full-stack)

```
meoo login                      # 1. Authenticate
meoo init nextjs-app            # 2. Initialize from template (or bring your own project)
meoo projects create "My App"   # 3. Create project and bind to current directory
# ... develop your app locally ...
meoo deploy                     # 4. Upload, build remotely, deploy to container
```

`meoo init nextjs-app`、`nuxt-app`、`python-app`、`go-app`、`java-app` 已包含完整 `mise.toml` 和对应 Agent 指引，无需手工改配置即可 Push/Deploy。已有非 Mise 全栈工程保留旧 runtime 和发布方式，不强制迁移；要接入新预览时再按 `references/mise-import.md` 适配。不要把未验证的老工程预览报告为成功。

旧全栈工程接入 Mise 时，发布前必须逐项执行 `references/mise-import.md` 的“旧全栈迁移检查表”：Mise 构建不会自动执行项目 Dockerfile，不能只补 dev/start 就发布。保留原依赖安装、环境默认值、资源文件和解释器语义，在干净环境验证预览和生产启动；不要影响没有选择 Mise 的标准 React 老项目。

### Common steps (both modes)

**Cloud services are OPTIONAL** — only enable when the project needs database, user auth, or file storage:
```
meoo cloud enable               # Provision cloud services (PostgreSQL + Auth + Storage)
meoo cloud pull-env             # Pull Supabase keys to local .env
```
Do NOT run `meoo cloud enable` for purely frontend projects (static sites, CSS demos, calculators, etc.).

Cloud services are independent of deploy mode — see `references/cloud-patterns.md` for calling patterns.

Run `meoo info` or `meoo --json info` anytime to check environment constraints.

## Publishing & deployment targets

Meoo has three deployment targets. Understanding them prevents common confusion.

- **Sandbox（沙箱）**：秒悟应用内的测试运行环境。标准 React 沿用平台原有 dev server；Mise 项目由 `mise run dev` 在 3015 提供预览。两者都支持 `meoo sandbox push` 和 Deploy 附带同步。
- **CDN（公网静态）**：static 模式专属。标准静态项目发布 dist/build/out，Mise 项目发布 `output` 声明的产物。
- **FC 容器（公网服务）**：server 模式专属。通过 `meoo deploy` 将源码上传到远程构建机，按 Mise 构建并部署到函数计算容器。

| | Sandbox（沙箱） | CDN（静态部署） | FC 容器（镜像部署） |
|---|---|---|---|
| 用途 | 秒悟应用内预览、调试、协作 | 公网正式访问（静态） | 公网正式访问（全栈） |
| 更新方式 | `meoo sandbox push` 或 `meoo deploy` | `meoo deploy` | `meoo deploy` |
| 访问入口 | `meoo.com/chat/<projectId>` | `<id>.meoo.fun` | `<id>.meoo.fun` |

**`meoo deploy` 流程**：先按项目实际策略分流，仅 Mise 项目做 Mise 前置校验；默认尝试同步 Sandbox，再执行正式发布。Sandbox 同步失败必须告知用户，但不影响正式发布结果；静态项目会回退到本地产物 CDN 发布。

静态云服务项目同步成功后，从已确认的 Sandbox Git HEAD 构建并发布；DUAL 环境随后同步生产云服务。默认同步云函数，不同步 Auth 与定时任务。`--skip-push` 只跳过 Sandbox 并走本地产物发布；`--skip-build` 使用已有 Mise output；`--no-dev` 同步源码但不触发预览重启。不要把 Sandbox 未更新或预览为空报告为完整成功。

静态项目若要在秒悟应用内预览或协作，源码必须通过 `meoo sandbox push` 或 `meoo deploy`（不加 `--skip-push`）同步到沙箱。新全栈模板由 Mise server 模式决定正式发布，并由同一次 `meoo deploy` 尝试同步 Sandbox；已有非 Mise 全栈项目保留原 image 发布方式。

## Migrating an existing project

已有标准模板和非 Mise 项目不要重建脚手架，也不要为了正常 Push/Deploy 增加 Mise。首次接入的外部单/多 HTML、SPA 或全栈工程才先读 `references/mise-import.md`，保留技术栈并做最小运行适配；静态细节见 `references/static-deploy.md`，服务端细节见 `references/image-deploy.md`。

---

## Platform constraints

Constraints differ by deploy mode. **Read the relevant reference before starting any project work:**

- **Mise 项目及首次接入的外部 Web 工程**：先读 `references/mise-import.md`；标准模板和已有非 Mise 项目不强制迁移。
- **Static deploy**：再读 `references/static-deploy.md`。
- **Server deploy**：再读 `references/image-deploy.md`。

---

## CLI command reference

All commands support `--json` for structured output. Run `meoo <command> --help` for details.

### Authentication & Account

```bash
meoo login                         # Browser-based login (recommended, opens browser for authorization)
meoo login --ak <key>              # Login with API Key (for CI/CD or manual setup)
meoo logout                        # Clear credentials
meoo whoami                        # Current user info + plan tier
meoo account                       # Full account info: plan, benefits, credits
```

`meoo login` (without `--ak`) opens the browser for one-click authorization. The server auto-creates an API Key and the CLI saves it locally. For CI/CD environments, use `--ak` or set `MEOO_API_KEY` / `MEOO_API_URL` environment variables.

`meoo account` shows your plan tier (FREE/PRO/MAX), credit balance (available, granted, consumed), and detailed benefit quotas (cloud instances, storage, projects, etc.).

### Project management

Project binding is **per-directory** — each project directory has its own `.env` with `MEOO_PROJECT_URL_ID`. There is no global "current project". Switching directories switches projects automatically.

```bash
meoo projects list                 # List projects (▸ = bound to current directory)
meoo projects create [name]        # Create project and bind to current directory (.env)
meoo projects use <urlId>          # Bind existing project to current directory (.env)
meoo projects current              # Show project bound to current directory
```

If a command fails with `NO_PROJECT_BOUND`, run `meoo projects use <urlId>` in the target directory first.

`projects use` 的项目绑定不依赖前端框架或 `src/supabase/client.ts`：

- 纯空目录、全栈 Image 项目和自定义框架均可绑定并同步 `.env`。
- 仅官方 Meoo Vite 模板会自动生成或更新 Supabase Client 与代理配置。
- 自定义源码、Next.js、Nuxt、FastAPI 等不会被 CLI 猜测或覆盖；看到 warning 时保留绑定，按项目自身方式读取 `.env`。
- 本地 `.env` 只包含开发所需的 URL、anon key 和项目标识，不写入 Service Role Key 或数据库管理连接。

### Templates (static deploy only)

```bash
meoo init --list                   # List available templates
meoo init <template>               # Initialize in current (empty) directory
```

**Static deploy templates** (前端 SPA → CDN):

| Template | Stack | Key rules |
|----------|-------|-----------|
| `react-design` | React 19 + Vite 7 + shadcn/ui + TanStack Router | Default Web template; do NOT reinstall Radix, use `@` path alias |
| `custom-project` | Vue / Svelte / other non-React | User must explicitly request non-React framework |
| `taro-project` | Taro 4 + React + Zustand | No native HTML tags, no arbitrary values |

**Server deploy templates** (全栈应用 → 容器；模板默认生产端口可按项目实际保留):

| Template | Stack | Key rules |
|----------|-------|-----------|
| `nextjs-app` | Next.js 15 + React 19 + Tailwind CSS | standalone output, port 9000 |
| `nuxt-app` | Nuxt 3 + Vue 3 + Tailwind CSS | nitro server, port 9000 |
| `java-app` | Spring Boot 3 + React SPA | Maven build, port 9000 |
| `go-app` | Go net/http + React SPA | go build, port 9000 |
| `python-app` | FastAPI + React SPA | pip + uvicorn, port 9000 |

See `references/templates.md` for full template-specific constraints.

### Cloud services

```bash
meoo cloud enable                  # Provision PostgreSQL + Auth + Storage + Realtime
meoo cloud enable --env-mode DUAL  # Choose dual development/production environments on first enable (requires server-side qualification)
meoo cloud status                  # Check status
meoo cloud pull-env                # Pull Supabase keys to .env
meoo cloud enable-register-login --providers <type>  # Enable email/SMS verification auth
```

After `cloud enable`, the CLI shows your current cloud service quota, storage usage, and available credits, then attempts to reconcile local connection info automatically. Use `pull-env` to refresh or retry that local synchronization. The `.env` tracks which project it belongs to via `MEOO_PROJECT_URL_ID`.
`meoo cloud enable` is idempotent for a project that already has cloud service: it reuses the existing SINGLE or DUAL instance, does not request another instance or consume additional instance quota, and only reconciles service readiness and local connection files. A full new-instance quota must not block this repeated-enable path.
Omitting `--env-mode` preserves the existing platform default. `--env-mode SINGLE` selects a single environment; `--env-mode DUAL` explicitly requests separate development and production environments. The server rejects DUAL when the project or account is not eligible; do not silently retry as SINGLE. This option only applies when first enabling cloud service; it does not convert an existing instance.

**IMPORTANT — Quota / entitlement errors**: If `cloud enable` or any cloud command fails with `QUOTA_EXCEEDED`, `STORAGE_EXCEEDED`, or similar entitlement errors, you MUST:
1. **Stop all cloud operations immediately** — do not retry or attempt workarounds.
2. **Inform the user clearly** — explain which quota is full (e.g. cloud instance count, storage capacity).
3. **Guide the user to upgrade** — direct them to https://docs.meoo.com/coindesc to view plan tiers and upgrade. Example: "您的云服务实例数已达当前套餐上限，请前往 https://docs.meoo.com/coindesc 查看套餐详情并升级后继续使用。"
4. **Ask the user how to proceed** — do not assume they will upgrade. They may choose to go to https://meoo.com to delete unused projects/instances to free quota, or decide not to continue.

`enable-register-login` activates email/SMS verification + password auth. Provider types: `email`, `sms`, or `email,sms`. Single-provider requires `--confirmed-provider-set` flag. This command is idempotent — if the requested providers are already enabled, it skips activation and avoids unnecessary service restart. When activation is needed, it triggers a cloud service restart — always run it LAST, after all migrations and code changes.

### Database

```bash
meoo db query "SELECT * FROM users"        # Execute SQL
meoo db query --file setup.sql             # From file
meoo db tables                             # List tables + columns
meoo db migrate --name <n> --sql <ddl>     # DDL + save migration + update types
```

`--name`, `--sql` are both required for `migrate`. It writes:
- `migrations/{timestamp}_{name}.sql`
- `src/supabase/types.ts` (auto-generated from DB schema)

### Edge Functions

```bash
meoo fn list                               # List functions + secrets
meoo fn deploy <name>                      # Deploy from ./functions/<name>/
meoo fn deploy <name> --no-verify-jwt      # Allow anonymous access
meoo fn delete <name>                      # Delete function
```

Functions run on Deno. Entry must be `index.ts`. Name regex: `/^[A-Za-z][A-Za-z0-9_-]*$/`.

`MEOO_PROJECT_API_KEY` can be used in Edge Functions and image deploy server code. Never in frontend. For static deploy projects, proxy AI calls through Edge Functions.

### Secrets

```bash
meoo secrets list                          # List all
meoo secrets set <KEY> <VALUE>             # Set or update
meoo secrets delete <KEY>                  # Delete
```

### Sandbox (code sync)

标准模板及已有非 Mise 项目沿用原代码同步链路；符合 Mise 协议的 static/server 项目按 Mise 同步和预览。

```bash
meoo sandbox push [path]                   # Upload local code to sandbox
meoo sandbox push --dry-run                # Check status without uploading
meoo sandbox push --force                  # Skip confirmation prompts
meoo sandbox push --summary "changed X"    # Attach change summary (for AI agent context)
meoo sandbox push --message "my commit"    # Custom commit message
meoo sandbox push --no-commit              # Upload without git commit
meoo sandbox push --no-dev                 # Upload without preview restart

meoo sandbox pull [path]                   # Download code from sandbox to local
meoo sandbox pull --dry-run                # List sandbox files without downloading
meoo sandbox pull --force                  # Skip confirmation prompts
meoo sandbox pull --output <dir>           # Output to specific directory
```

**Push safety checks** (automatic before upload):
1. Validates root `mise.toml` only for explicitly opted-in Mise projects; legacy React needs no Mise file
2. Detects if sandbox **Agent is running** — blocks standalone push (AGENT_RUNNING error)
3. Compares sandbox HEAD with last synced commit and warns about remote changes
4. Prompts for confirmation when overwrite risk exists (use `--force` to skip)

传入单个文件时仍会附带并持久化根 `mise.toml` 控制文件。独立 `sandbox push` 失败为非零；`deploy` 内部同步失败只影响 `sandboxSync`，会继续正式发布。

**Pull restrictions**: Free plan users cannot pull code — only push is allowed. Upgrade to PRO/MAX for code download.

**Sync tracking**: After each push/pull, the CLI records the sandbox HEAD commit hash locally (`~/.meoo/config.json`). On next push, it compares this with the current sandbox HEAD to determine if remote changes occurred since last sync.

**Mock conversation**: After a successful push, a conversation record is created in the project so the AI agent has context about the code change.

### Deployment

```bash
# Mise decides static CDN or server container
meoo deploy                                # Default: sync Sandbox, then formal release
meoo deploy --force                        # Skip all confirmation prompts (for AI/CI)
meoo deploy --skip-build                   # Static: use existing Mise output
meoo deploy --skip-push                    # Formal release only
meoo deploy --no-dev                       # Sync source without preview restart
meoo deploy --sync-auth                    # DUAL: also sync login configuration
meoo deploy --sync-cron                    # DUAL: also sync cron (implies functions)
meoo deploy --no-sync-functions            # DUAL: omit function sync (unless cron selected)

meoo releases list                         # Version history (both static and image releases)
```

After successful deploy, the CLI shows the project settings URL for custom domain configuration and permission management.

**Server deploy upload**: Source upload honors `.dockerignore`; source archive must be ≤100MiB. Build/start behavior comes from `mise.toml`, not fixed shell-script filenames.

**Mise server 打包必查**：使用 `**`、`*` 等先排除再放行的严格 `.dockerignore` 白名单时，必须在文件末尾保留 `!.meoo-runtime/` 和 `!.meoo-runtime/**`，同时保留根 `mise.toml`。该目录由平台远端生成，本地不存在是正常的，不要手写或复制平台脚本；完整规则和失败处理见 [Server Deploy](references/image-deploy.md#dockerignore-与平台运行文件)。

Mise server 发布前可能提示 `MISE_DEPENDENCY_SETUP_UNVERIFIED`：有依赖清单但无 install/build 任务。它是风险告警，不强制每个项目声明 install，也不阻止发布。失败时终端和 JSON 会给出可获取的启动线索、提交配置快照及修复指引；“可能遗漏安装”不是确定根因。当前线上入口的补充错误未确认对应本次版本，不能当成本次发布日志。诊断获取失败不会改变原部署失败结果。

### Upgrade

`meoo skill install` 安装当前 CLI 包内置的 Skill，不请求在线 manifest 或 ZIP。升级 CLI 后执行此命令；未识别当前 Agent 的工具目录时用 `--target <Skill目录>` 指定。安装后重新读取 `SKILL.md` 和 `references/mise-import.md`。遇到 `MISE_ADAPTATION_REQUIRED` 或 `RUNTIME_CONFIG_CONFLICT` 时先更新 Skill，再根据实际项目修复 Mise 配置；不要从旧 HTTP 地址覆盖新版 Skill。

```bash
meoo upgrade                               # Check and install latest version
```

The CLI automatically checks for updates once every 24 hours. When a new version is available, a notice is shown after command output.

### Info

```bash
meoo info                                  # Human-readable constraints
meoo --json info                           # JSON (for AI agent parsing)
```

---

## Cloud service rules

### BLOCKING: Read docs before cloud operations

Before writing any cloud service code, you MUST read the relevant reference:

- **Cloud patterns**: `references/cloud-patterns.md` — Supabase client (frontend + server-side), Edge Functions, AI chat, Auth, RLS, migrations
- **Email/SMS verification auth**: `references/auth-verification.md` — registration state machine, API usage rules, common pitfalls

`MEOO_PROJECT_API_KEY` can be used in Edge Functions and image deploy server code — never in frontend.

### Data rules

- All data MUST be real cloud data. NEVER use mock/fake data.
- When `src/supabase/client.ts` or `src/supabase/types.ts` contains the Meoo auto-generated marker, do NOT edit it manually. Custom projects may own different client files that the CLI intentionally leaves untouched.
- Do NOT modify system schemas (auth/storage/realtime/supabase_functions/vault).
- Cloud commands must be called individually (not chained with `&&`).

---

## Template-specific constraints (static deploy only)

Each template has strict constraints that will break the build if violated. Read `references/templates.md` BEFORE writing code for any template project.

---

## Available models (for AI integration)

| Model | ID |
|-------|-----|
| Qwen 3.6 Plus (default) | `qwen3.6-plus` |
| Kimi K2.5 | `kimi-k2.5` |
| DeepSeek V3.2 | `deepseek-v3.2` |
| GLM 5 | `glm-5` |
| MiniMax M2.5 | `MiniMax-M2.5` |

---

## Documentation

- **Product documentation**: https://docs.meoo.com — complete platform guide, tutorials, and API reference.
- **Plans & credits**: https://docs.meoo.com/coindesc — plan tiers (FREE/PRO/MAX), credit pricing, and benefit details.

When users ask about plan differences, credit consumption, pricing, or feature availability across tiers, direct them to the plans & credits page. When users need detailed platform usage instructions beyond what this skill covers, direct them to the product documentation.

---

## Known limitations

Do NOT attempt unsupported patterns — they will fail.

### Application types

- **Static deploy**: any project that produces a valid static output with `index.html`, including single/multi HTML and supported SPAs.
- **Server deploy**: any supported language/framework that can provide a single HTTP entry and satisfy the Mise contract.
- **No native mobile apps** — Taro covers WeChat mini programs + H5 only.

### Authentication (Supabase Auth)

Supported: username+password (default), email+password, phone-as-username, WeChat (mini program only), email/SMS verification code + password (requires `enable-register-login`). Pure passwordless verification-code login is NOT supported. No third-party OAuth (GitHub/Google/QQ/Alipay), no QR scan, no biometric. See `references/auth-verification.md`.

### Cloud services

- Cloud environment may be SINGLE or DUAL. DUAL keeps development and production Supabase instances separate; CLI cloud development commands remain on the development instance, while `meoo deploy` performs the explicit production sync.
- Edge Functions run Deno (not Node.js). Image deploy server code can use any runtime.
- Secrets are write-only — values cannot be read back after setting.

### AI service

- Fixed model list only (see Available models above). No GPT/Claude.
- For static deploy projects, must proxy AI calls through Edge Functions. Image deploy server code can use `MEOO_PROJECT_API_KEY` directly.
- Vision and image generation available at [meoo.com](https://meoo.com).

### Deployment

- No rollback — can only deploy a new version.
- No per-deploy preview release — every formal deploy goes to production immediately; Sandbox development preview is supported separately.

### Plans and entitlements

- Three tiers: FREE, PRO, MAX. FREE users cannot pull code from sandbox.
- AI services consume credits. Check with `meoo account`.
- **Quota enforcement** — when limits are reached, cloud operations are rejected. MUST stop immediately, explain the quota, and direct user to https://docs.meoo.com/coindesc to upgrade or to https://meoo.com to free up resources.

### CLI features not yet available

- `meoo domains` — custom domain management
- `meoo open` — open project in browser
- `meoo projects delete` — delete a project
- `meoo logs` — edge function logs
---

## Deploy to your own Alibaba Cloud account

> **触发条件**：仅当用户明确说了类似"部署到我自己的阿里云账号"、"用 ECS/RDS 跑这个，费用我自己出"这样的话才使用本节。用户单纯说"部署"、"上线"、"发布"时，走上面的 `meoo deploy`，不要联想到这里。

这是一个完全独立的第四条部署路径（`meoo aliyun <sub>`），不属于本技能其余部分覆盖的生命周期。**一旦触发，唯一的信息来源是 `references/aliyun-deploy.md`**——命令、flag、判断规则、状态文件、流程细节全部在那份文档里，本技能主文档和其他 `references/*.md` 的任何内容都与阿里云部署无关，不适用、也不要参照。触发后先读那份文档，再操作。

---
