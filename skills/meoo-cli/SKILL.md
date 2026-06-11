---
name: meoo-cli
description: >
  从零到上线的全栈应用构建指南，基于秒悟（Meoo）平台。
  触发条件：
  (1) 用户提到"秒悟"或"Meoo"；
  (2) 用户要从零构建应用，且需求可被以下架构覆盖：前端 SPA（React/Vue）+ Supabase（数据库/Auth/Storage）+ Deno 边缘函数 + AI 大模型服务。
  覆盖完整生命周期：项目初始化、本地开发、云服务开通、数据库管理、边缘函数部署、CDN 发布、沙箱代码同步、账户与权益管理。
---

# 秒悟（Meoo）CLI 完整指南

从零构建和部署全栈应用。覆盖项目初始化到生产部署的完整生命周期，包括云服务、代码规范、沙箱同步和部署。

## Install

```bash
npm install -g @aliyun-meoo/cli
```

Verify: `meoo --version`

## Project lifecycle

```
meoo login                      # 1. Authenticate (opens browser)
meoo init react-design          # 2. Initialize from template
meoo projects create "My App"   # 3. Create remote project (MUST do after init)
pnpm install                    # 4. Install dependencies
pnpm dev                        # 5. Local dev server (port 3015)
meoo deploy                     # 6. Build and publish to CDN
meoo sandbox push               # Alt: push local code to cloud sandbox
meoo sandbox pull               # Alt: pull sandbox code to local
meoo account                    # Check plan, credits, and benefits
```

**CRITICAL**: Step 2 (`init`) and Step 3 (`projects create`) MUST be done together. `init` only creates local files — you MUST also run `projects create` to create the remote project on the platform. Without this, cloud services and deployments will fail or attach to the wrong project.

**Cloud services are OPTIONAL** — only enable when the project needs database, user auth, or file storage:
```
meoo cloud enable               # Provision cloud services (PostgreSQL + Auth + Storage)
meoo cloud pull-env             # Pull Supabase keys to local .env
```
Do NOT run `meoo cloud enable` for purely frontend projects (static sites, CSS demos, calculators, etc.).

Run `meoo info` or `meoo --json info` anytime to check environment constraints.

## Two publishing paths: Sandbox vs CDN

Meoo has two independent内容路径，混淆它们是新用户最常见的问题。

- **Sandbox（沙箱）**：秒悟应用内的测试运行环境。源码通过 `meoo sandbox push` 或 `meoo deploy`（含推送）同步到沙箱，沙箱内 dev server 实时编译运行。在 `https://meoo.com/chat/<projectId>` 的编辑器中预览、查看代码和文件。
- **CDN（公网地址）**：通过 `meoo deploy` 将本地 `dist/` 构建产物发布到 CDN，生成公网访问地址 `https://<id>.meoo.fun`。

| | Sandbox（沙箱测试环境） | CDN（公网访问） |
|---|---|---|
| 用途 | 秒悟应用内预览、调试、协作 | 公网正式访问 |
| 内容 | 源码 → dev server 实时编译 | `dist/` 构建产物 |
| 更新方式 | `meoo sandbox push` 或 `meoo deploy`（含推送） | `meoo deploy` |
| 访问入口 | `https://meoo.com/chat/<projectId>` | `https://<id>.meoo.fun` |

**`meoo deploy` 流程**：默认先将源码同步到沙箱（会提示确认 "是否将本地代码同步到云端沙箱？"），然后构建并发布到 CDN。在 AI/CI 非交互环境中，使用 `meoo deploy --force` 跳过所有确认提示并自动推送。

**常见误解**：`meoo deploy --skip-push` 只更新 CDN，不同步沙箱。结果：公网地址正常，但秒悟应用内编辑器预览为空白。这不是 bug — 两个系统独立运作。

**规则**：如果用户需要在秒悟应用内预览或协作，源码必须通过 `meoo sandbox push` 或 `meoo deploy`（不加 `--skip-push`）同步到沙箱。

## Migrating an existing project

If the user already has a project (React/Vue SPA) and wants to deploy it on Meoo, do NOT run `meoo init`. Read `references/migration.md` for the complete migration flow: compatibility check, build config adaptation (Vite/Webpack), hash routing switch, pnpm migration, backend-to-Edge-Function conversion, and pre-deploy checklist.

## Publishing a static page (no build tooling)

For pre-built HTML/CSS/JS that doesn't need a build step:

1. `meoo projects create "My Static Page"`
2. `mkdir -p dist && cp your-page.html dist/index.html`
3. `meoo deploy --skip-build`

This publishes to CDN only. Editor preview/code will be empty — this is expected for static-only deploys.

**Note**: The "NEVER use a single HTML file" constraint applies only to projects developed on the platform (using templates). Static page publishing is a supported lightweight path.

---

## Hard constraints (platform-level)

Violating ANY of these will break the project. These apply to ALL templates and migrated projects.

### Port 3015

Dev server MUST run on port 3015 with `strictPort: true` and `host: '0.0.0.0'`. This is the only port exposed by the Meoo preview system. All templates are pre-configured — never modify the port config.

### No backend servers

NEVER start Express, Koa, Fastify, Flask, Django, FastAPI, or any backend server. Use Meoo Cloud instead:

| Need | Solution |
|------|----------|
| Database | `meoo db query` / `@supabase/supabase-js` |
| API endpoints | Edge Functions (`meoo fn deploy`) |
| Authentication | Supabase Auth |
| File storage | Supabase Storage |
| Environment variables | `meoo secrets set` |
| Real-time data | Supabase Realtime |

### Build output — do NOT modify

- Output directory: `dist/`
- Entry file: `dist/index.html`
- Base path: `./`
- Assets directory: `assets/`
- Assets inline limit: 1MB (images/fonts < 1MB are inlined as dataURL)

These values are hardcoded in vite.config / webpack.config. Changing `base`, `outDir`, `assetsDir`, or `assetsInlineLimit` will break OSS deployment and preview.

### Routing

Hash routing ONLY. Use `createHashRouter` (React), `createWebHashHistory` (Vue). Never use history mode — CDN serves static files without server-side routing.

All navigation MUST be implemented as URL routes first, then UI. Every tab/page needs a Route definition. (MANDATORY)

### Package manager

Use `pnpm` exclusively. Never use npm or yarn — they create lock file conflicts.

### Application structure

MUST create a standard multi-file SPA application. NEVER use a single HTML file for the entire app.

### Code style rules

- Single file soft limit: **260 lines**. Split into components/hooks when approaching this.
- Do NOT add comments unless the user explicitly requests them.
- Do NOT use emoji as icons — use `lucide-react` or inline SVG.
- Never use base64 images or create binary files.
- Local images MUST be placed in `src/assets/` and referenced via one of two Vite-supported methods:
  - **ES6 import** (static): `import hero from "@/assets/hero.png"` then `<img src={hero} />`
  - **`new URL` + `import.meta.url`** (supports dynamic paths): `<img src={new URL('/assets/hero.png', import.meta.url).href} />`
- Never use local filesystem paths (like `/home/user-files/` or `/home/project/assets/`) directly in `<img src>` or CSS `url()` — Vite/webpack cannot resolve them at build time.
- Never use colors not defined in the Tailwind config.
- Never use external CDN links for JS/CSS — all references must be relative paths.
- Never use scss/sass.
- Never use esbuild directly or any binary dependencies.
- **Fonts**: Never use external CDN font links (e.g. `<link href="fonts.googleapis.com">`). Use `@fontsource` instead:
  ```bash
  pnpm add @fontsource-variable/inter
  ```
  ```ts
  // main.tsx or main.ts top-level
  import "@fontsource-variable/inter";
  ```
  For `react-design` template: if `tsc` reports TS2307 on font imports, add `declare module "@fontsource-variable/*";` to a `.d.ts` file in `src/types/` (this is pre-configured in new projects).
- After any file edit, run `pnpm run dev` before delivering to verify zero compilation errors.

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

### Templates

```bash
meoo init --list                   # List available templates
meoo init <template>               # Initialize in current (empty) directory
```

| Template | Stack | Key rules |
|----------|-------|-----------|
| `react-project` | React 18 + Webpack 5 + Tailwind 3 | No scss/sass/esbuild |
| `react-vite-project` | React 18 + Vite 5 + Tailwind 3 | No scss/sass, don't modify vite.config |
| `react-design` | React 19 + Vite 7 + shadcn/ui + TanStack Router | Do NOT reinstall Radix, use `@` path alias |
| `vue-project` | Vue 3 + Vite 5 + Pinia | **No third-party UI/icon libs at all** |
| `taro-project` | Taro 4 + React + Zustand | No native HTML tags, no arbitrary values |

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

### Secrets

```bash
meoo secrets list                          # List all
meoo secrets set <KEY> <VALUE>             # Set or update
meoo secrets delete <KEY>                  # Delete
```

### Sandbox (code sync)

Sync code between your local machine and the cloud sandbox.

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
meoo deploy                                # Build + upload to CDN (prompts to push source to sandbox)
meoo deploy --force                        # Skip all confirmation prompts (for AI/CI)
meoo deploy --skip-build                   # Upload existing dist/
meoo deploy --skip-push                    # Skip sandbox push (CDN only, editor preview won't update)
meoo releases list                         # Version history
```

After successful deploy, the CLI shows the project settings URL for custom domain configuration and permission management.

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

Before executing any cloud CLI command or writing cloud service code, you MUST understand the patterns. Read `references/cloud-patterns.md` for:
- Supabase client setup and CRUD patterns
- Edge Function structure and `MEOO_PROJECT_API_KEY` usage
- AI chat integration (LLM proxy via Edge Function)
- Authentication and file storage
- Row Level Security (RLS) patterns
- Database migration workflow

When implementing **email/SMS verification + password auth** (registration verification codes, login second-factor, forgot password with verification), read `references/auth-verification.md` BEFORE writing any auth code. This covers the Supabase API usage rules, registration state machine, and common pitfalls that cause 422/403 errors.

**AI vision / image understanding** and **AI image generation / editing** are available as platform capabilities. To integrate these features, visit [meoo.com](https://meoo.com) for setup and documentation.

### Data rules

- All data MUST be real cloud data. NEVER use mock/fake data.
- `src/supabase/client.ts` and `src/supabase/types.ts` are auto-generated — do NOT edit them manually.
- Do NOT modify system schemas (auth/storage/realtime/supabase_functions/vault).
- RLS policy names: English snake_case, no quotes, no Chinese, no spaces.
- `MEOO_PROJECT_API_KEY` MUST NEVER appear in frontend code. Always proxy through Edge Functions.

### Cloud CLI execution rules

- Cloud commands must be called individually (not chained with `&&`).
- SQL execution only via `meoo db query/migrate --sql "..."` — do not pipe .sql files.

---

## Template-specific constraints

See `references/templates.md` for the full breakdown. Critical differences:

**react-design**: 46 shadcn/ui components pre-installed. Do NOT `pnpm install` any Radix primitives. Route files in `src/routes/` using `createFileRoute`. `src/routeTree.gen.ts` is auto-generated — never edit manually. Use `cva` for conditional styles, not inline ternaries.

**vue-project**: **Zero third-party UI or icon libraries allowed.** No Element Plus, Ant Design Vue, Naive UI, Vuetify, or any others. Build everything from scratch with Tailwind + native HTML. Icons must be inline SVG only.

**taro-project**: No native HTML tags — use `@tarojs/components` exclusively. No Tailwind arbitrary values (`w-[100px]`), no `peer-*`/`group-*` modifiers, no decimal values (`space-y-1.5`). Bundle ≤ 2MB. TabBar needs ≥ 2 items. Use `Taro.*StorageSync` instead of localStorage.

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

Understand these limitations before starting a project. Do NOT attempt unsupported patterns — they will fail.

### Login & authentication

- **Browser login (default)** — `meoo login` opens the browser for one-click authorization. An API Key is auto-created and saved locally.
- **AK manual mode** — `meoo login --ak <key>` for CI/CD or environments without a browser. AKs can be created in the Web UI (Settings → API Keys).
- **No account registration via CLI** — users must already have a Meoo platform account.

### Supported application types

- **Frontend-only static apps** — React, Vue, Taro (mini program). No SSR, no Next.js, no Nuxt.
- **No backend server processes** — cannot run Express, Koa, FastAPI, Django, etc. Use Edge Functions instead.
- **No Angular, Svelte, SolidJS** — only React, Vue, and Taro templates are available.
- **No native mobile apps** — iOS/Android not supported. Taro covers WeChat mini programs + H5 only.

### AI service

- **Fixed model list** — only the models listed above are available. Cannot use GPT, Claude, or other non-Meoo models through this integration.
- **Text chat** — `references/cloud-patterns.md` covers text-only AI chat via Edge Function.
- **Vision / image understanding** — available as platform capability, visit [meoo.com](https://meoo.com) to set up.
- **Image generation / editing** — available as platform capability, visit [meoo.com](https://meoo.com) to set up.
- **Must proxy through Edge Function** — frontend code CANNOT call `api.meoo.host` directly. The `MEOO_PROJECT_API_KEY` must only be used server-side (in Edge Functions).
- **No streaming in non-stream mode** — if `stream: false`, the entire response is returned at once. For chat UIs, always use `stream: true`.

### User authentication in projects (Supabase Auth)

Users' apps built on Meoo have these auth options:

**Basic auth (no verification code):**
- **Username + password** (default, recommended) — uses virtual email `{username}@meoo.local` internally
- **Email + password** — only when user explicitly requests real email
- **Phone as username** — phone number used as username, NOT SMS OTP
- **WeChat login** — mini program only (`taro-project` template)

**Verification auth (email/SMS verification code + password):**
- **Email verification code + password** — registration confirmation, login second-factor, forgot password
- **SMS verification code + password** — same capabilities via SMS (China mainland +86 only)
- Requires `meoo cloud enable-register-login` to activate. Read `references/auth-verification.md` for full implementation guide.
- Pure passwordless verification-code login is NOT supported — verification must pair with password.

**NOT supported — do NOT attempt:**
- Pure verification-code passwordless login (no password)
- Third-party OAuth (GitHub, Google, QQ, Alipay) — except WeChat in mini program
- QR code scan login
- Biometric login (fingerprint, face)

If a user asks for any unsupported login method, clearly inform them it's not available on Meoo Cloud.

### Cloud services

- **One Supabase instance per project** — cannot create multiple databases for a single project.
- **PostgreSQL only** — no MySQL, MongoDB, Redis, or other database engines.
- **Edge Functions run Deno** — not Node.js. Cannot use Node.js-specific APIs or npm packages that don't support Deno.
- **Secrets are write-only** — `meoo secrets list` shows names but not values. Once set, you cannot read secret values back.

### Deployment

- **Static CDN only** — `meoo deploy` uploads `dist/` to OSS/CDN. No server-side rendering, no serverless function deployment (those go through `meoo fn deploy`).
- **No rollback** — version rollback is currently disabled on the platform. You can only deploy a new version.
- **No preview deployments** — every `meoo deploy` goes to production immediately. No staging/preview URLs.
- **Build runs locally** — `meoo deploy` executes `pnpm run build` on your machine. Make sure all dependencies and build tools are installed locally.

### Environment

- The CLI API is deployed at `https://meoo.com`.
- **Port 3015 fixed** — cannot change the dev server port. This is a platform-level constraint.
- **pnpm required** — npm and yarn are not supported and will cause lock file conflicts.

### Plans and entitlements

- **Three plan tiers** — FREE, PRO, MAX. Each tier has different quotas for cloud instances, storage, projects, credits, and features.
- **FREE plan restrictions** — free users can push code to sandbox but **cannot pull** (download) code. Upgrade to PRO or MAX for code download.
- **Credits consumed by AI services** — deploying AI Edge Functions and using AI models consumes account credits. Check balance with `meoo account`.
- **Quota enforcement** — when cloud instance count, storage, or other benefits reach the plan limit, cloud operations will be rejected. The agent MUST stop immediately, explain the quota issue, and direct the user to https://docs.meoo.com/coindesc to upgrade their plan. Do NOT retry, workaround, or silently skip — always pause and let the user decide (upgrade plan at https://docs.meoo.com/coindesc, or go to https://meoo.com to free up existing resources).

### Sandbox sync

- **Agent conflict protection** — cannot push code while the sandbox Agent is actively running. Wait for the agent task to complete first.
- **No merge** — push/pull is overwrite-based. If both local and sandbox have changes, the push will overwrite sandbox code. The CLI warns when remote changes are detected, but does not merge.
- **Sync state is local** — the last synced commit hash is stored in `~/.meoo/config.json`. Clearing this file resets sync tracking (next push will show "first sync").

### CLI features not yet available

- `meoo domains` — custom domain management
- `meoo open` — open project in browser
- `meoo projects delete` — delete a project
- `meoo logs` — edge function logs
