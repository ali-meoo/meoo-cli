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

Meoo 支持两种部署模式：**静态部署**（前端 SPA → CDN）和**镜像部署**（全栈应用 → 容器）。

| 项目类型 | 部署模式 | 命令 |
|---|---|---|
| 纯前端 SPA（React/Vue/Taro） | 静态部署 | `meoo deploy` |
| 前端 + Supabase + Edge Functions | 静态部署 | `meoo deploy` |
| 含后端进程（Express、FastAPI、Next.js SSR、Go 等） | 镜像部署 | `meoo deploy --runtime image` |

**如何判断**：项目是否需要一个监听端口的服务器进程？是 → 镜像部署；否 → 静态部署。

## Install

```bash
npm install -g @aliyun-meoo/cli
```

Verify: `meoo --version`

## Project lifecycle

### Static deploy (SPA)

```
meoo login                      # 1. Authenticate (opens browser)
meoo init react-design          # 2. Initialize from template
meoo projects create "My App"   # 3. Create remote project (MUST do after init)
pnpm install                    # 4. Install dependencies
pnpm dev                        # 5. Local dev server (port 3015)
meoo deploy                     # 6. Build and publish to CDN
```

**CRITICAL**: Step 2 (`init`) and Step 3 (`projects create`) MUST be done together. `init` only creates local files — you MUST also run `projects create` to create the remote project on the platform. Without this, cloud services and deployments will fail or attach to the wrong project.

### Image deploy (full-stack)

```
meoo login                      # 1. Authenticate
meoo init nextjs-app            # 2. Initialize from template (or bring your own project)
meoo projects create "My App"   # 3. Create project and bind to current directory
# ... develop your app locally ...
meoo deploy                     # 4. Upload, build remotely, deploy to container
```

Image deploy templates include `.meoo/config.json` with `runtime: "image"` pre-configured, so `meoo deploy` automatically uses image mode. If bringing your own project (without `meoo init`), add `scripts/setup.sh` + `scripts/start.sh` and run `meoo deploy --runtime image` for the first deploy.

Image deploy projects only support local development — they cannot be developed or previewed on the Meoo platform website (meoo.com). See `references/image-deploy.md` for required files and constraints.

After the first successful `meoo deploy --runtime image`, the runtime is saved to `.meoo/config.json`. Subsequent deploys only need `meoo deploy` — the CLI reads the saved runtime automatically.

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

- **Sandbox（沙箱）**：秒悟应用内的测试运行环境。静态项目的源码通过 `meoo sandbox push` 或 `meoo deploy`（含推送）同步到沙箱，沙箱内 dev server 实时编译运行。在 `https://meoo.com/chat/<projectId>` 的编辑器中预览、查看代码和文件。**全栈镜像项目不支持 `meoo sandbox push`。**
- **CDN（公网静态）**：静态部署专属。通过 `meoo deploy` 将本地 `dist/` 构建产物发布到 CDN，生成公网访问地址 `https://<id>.meoo.fun`。
- **FC 容器（公网服务）**：镜像部署专属。通过 `meoo deploy --runtime image` 将源码上传到远程构建机，打包 Docker 镜像，部署到阿里云函数计算容器，生成公网访问地址。

| | Sandbox（沙箱） | CDN（静态部署） | FC 容器（镜像部署） |
|---|---|---|---|
| 用途 | 秒悟应用内预览、调试、协作 | 公网正式访问（静态） | 公网正式访问（全栈） |
| 更新方式 | 静态项目：`meoo sandbox push` 或 `meoo deploy` | `meoo deploy` | `meoo deploy --runtime image` |
| 访问入口 | `meoo.com/chat/<projectId>` | `<id>.meoo.fun` | `<id>.meoo.fun` |

**`meoo deploy` 流程（静态部署）**：默认先将源码同步到沙箱（会提示确认 "是否将本地代码同步到云端沙箱？"），然后构建并发布到 CDN。在 AI/CI 非交互环境中，使用 `meoo deploy --force` 跳过所有确认提示并自动推送。

**常见误解**：`meoo deploy --skip-push` 只更新 CDN，不同步沙箱。结果：公网地址正常，但秒悟应用内编辑器预览为空白。这不是 bug — 两个系统独立运作。

**规则**：静态项目如果需要在秒悟应用内预览或协作，源码必须通过 `meoo sandbox push` 或 `meoo deploy`（不加 `--skip-push`）同步到沙箱。全栈镜像项目不能使用 `meoo sandbox push`，应通过 `meoo deploy` 发布。

## Migrating an existing project

**Frontend SPA**: If the user already has a React/Vue SPA and wants to deploy it on Meoo via static deploy, do NOT run `meoo init`. Read `references/migration.md` for the complete migration flow: compatibility check, build config adaptation (Vite/Webpack), hash routing switch, pnpm migration, backend-to-Edge-Function conversion, and pre-deploy checklist.

**Full-stack app**: If the user has an existing app with a backend (Express, FastAPI, Next.js, etc.), use image deploy. No template migration needed — just add `scripts/setup.sh` and `scripts/start.sh`, then `meoo deploy --runtime image`. See `references/image-deploy.md` for full requirements and example scripts.

---

## Platform constraints

Constraints differ by deploy mode. **Read the relevant reference before starting any project work:**

- **Static deploy**: Read `references/static-deploy.md` — port 3015, hash routing, build output rules, pnpm only, no backend servers, code style rules
- **Image deploy**: Read `references/image-deploy.md` — port 9000, `scripts/setup.sh` + `scripts/start.sh`, cold start

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

**Image deploy templates** (全栈应用 → 容器):

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
meoo cloud status                  # Check status
meoo cloud pull-env                # Pull Supabase keys to .env
meoo cloud enable-register-login --providers <type>  # Enable email/SMS verification auth
```

After `cloud enable`, the CLI shows your current cloud service quota, storage usage, and available credits. It also warns that deploying AI services consumes credits. Always run `pull-env` next to sync connection info locally. The `.env` tracks which project it belongs to via `MEOO_PROJECT_URL_ID`.

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

Sync code between your local machine and the cloud sandbox. `sandbox push` only supports static projects; image/full-stack projects must use `meoo deploy`.

```bash
meoo sandbox push [path]                   # Upload local code to sandbox
meoo sandbox push --dry-run                # Check status without uploading
meoo sandbox push --force                  # Skip confirmation prompts
meoo sandbox push --summary "changed X"    # Attach change summary (for AI agent context)
meoo sandbox push --message "my commit"    # Custom commit message
meoo sandbox push --no-commit              # Upload without git commit

meoo sandbox pull [path]                   # Download code from sandbox to local
meoo sandbox pull --dry-run                # List sandbox files without downloading
meoo sandbox pull --force                  # Skip confirmation prompts
meoo sandbox pull --output <dir>           # Output to specific directory
```

**Push safety checks** (automatic before upload):
1. Detects if sandbox **Agent is running** — blocks push if so (AGENT_RUNNING error)
2. Compares sandbox HEAD with last synced commit — warns if remote has new changes
3. Lists uncommitted files in sandbox — warns about unsaved work
4. Prompts for confirmation when warnings exist (use `--force` to skip)

**Pull restrictions**: Free plan users cannot pull code — only push is allowed. Upgrade to PRO/MAX for code download.

**Sync tracking**: After each push/pull, the CLI records the sandbox HEAD commit hash locally (`~/.meoo/config.json`). On next push, it compares this with the current sandbox HEAD to determine if remote changes occurred since last sync.

**Mock conversation**: After a successful push, a conversation record is created in the project so the AI agent has context about the code change.

### Deployment

```bash
# Static deploy (SPA → CDN)
meoo deploy                                # Build + upload to CDN (prompts to push source to sandbox)
meoo deploy --force                        # Skip all confirmation prompts (for AI/CI)
meoo deploy --skip-build                   # Upload existing dist/
meoo deploy --skip-push                    # Skip sandbox push (CDN only, editor preview won't update)

# Image deploy (full-stack → container)
meoo deploy --runtime image                # Upload source → remote build → deploy to FC container
meoo deploy --runtime image --force        # Skip confirmations

meoo releases list                         # Version history (both static and image releases)
```

After successful deploy, the CLI shows the project settings URL for custom domain configuration and permission management.

**Image deploy upload**: Source upload honors `.dockerignore` with `.gitignore`-like matching (`node_modules`, `.next`, `dist`, `*.log`, `!keep`). Missing `.dockerignore` uses safe defaults; source archive must be ≤100MiB.

### Upgrade

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
- `src/supabase/client.ts` and `src/supabase/types.ts` are auto-generated — do NOT edit.
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

- **Static deploy templates**: React, Vue, Taro only. No Angular/Svelte/SolidJS. See `references/static-deploy.md`.
- **Image deploy**: any language/framework that can bind an HTTP port. See `references/image-deploy.md`.
- **No native mobile apps** — Taro covers WeChat mini programs + H5 only.

### Authentication (Supabase Auth)

Supported: username+password (default), email+password, phone-as-username, WeChat (mini program only), email/SMS verification code + password (requires `enable-register-login`). Pure passwordless verification-code login is NOT supported. No third-party OAuth (GitHub/Google/QQ/Alipay), no QR scan, no biometric. See `references/auth-verification.md`.

### Cloud services

- One Supabase instance per project. PostgreSQL only.
- Edge Functions run Deno (not Node.js). Image deploy server code can use any runtime.
- Secrets are write-only — values cannot be read back after setting.

### AI service

- Fixed model list only (see Available models above). No GPT/Claude.
- For static deploy projects, must proxy AI calls through Edge Functions. Image deploy server code can use `MEOO_PROJECT_API_KEY` directly.
- Vision and image generation available at [meoo.com](https://meoo.com).

### Deployment

- No rollback — can only deploy a new version.
- No preview deployments — every deploy goes to production immediately.

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