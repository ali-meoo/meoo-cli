# Image Deploy (Full-Stack) Reference

Full-stack application deployment via `meoo deploy --runtime image`. Uploads local source code, runs `scripts/setup.sh`, and deploys a server process.

Use image deploy when the project needs a server process (Express, Koa, FastAPI, Django, Next.js SSR, Go, Rust, etc.).

**Important**: Image deploy projects only support local development. They cannot be developed or previewed on the Meoo platform website (meoo.com) — only deployed via CLI.

## Quick start with templates

Use `meoo init` to scaffold a full-stack project with pre-configured build/start scripts:

```bash
meoo init nextjs-app            # or: nuxt-app, java-app, go-app, python-app
meoo projects create "My App"
# verify locally, then deploy:
meoo deploy
```

Templates include `.meoo/config.json` (runtime pre-set), `scripts/setup.sh`, `scripts/start.sh`, and a working frontend + backend demo. No additional configuration needed.

If bringing your own project (without a template), continue reading for required files and constraints.

## Build environment

The remote build environment is managed by Meoo. Do not ask users to configure platform build or deployment infrastructure.


The following supply runtimes and tools are pre-installed in the build environment. **Use only these — do not install additional runtimes.** Application-level dependencies (npm packages, pip packages, Go modules, etc.) should be installed in `scripts/setup.sh`.
| Component | Version / Notes |
|---|---|
| OS | Linux; scripts run in `/code` |
| Node.js | `24.15.0` |
| npm | `11.13.0` |
| Yarn | `1.22.22` |
| pnpm | `10.33.3` |
| Python | `3.13` |
| Go | `1.26.0` |
| Java | OpenJDK 21 |
| System tools | `git`, `curl`, `wget`, `unzip`, `rsync`, `build-essential`, `pkg-config` |

This is the supported runtime list. If the user's project requires a runtime not listed here (e.g. Rust, Ruby, .NET), it is not supported.

## Build and runtime image

The build environment and deployed runtime use the same platform baseline. Treat `scripts/setup.sh` as the step that prepares files and dependencies for the deployed runtime, and treat `scripts/start.sh` as the command that starts the app after deployment. Only use environment variables for real app configuration such as secrets, API endpoints, feature flags, or user-provided runtime settings.

## Required files

- `scripts/setup.sh` — Runs on the remote build worker in `/code` directory. Install dependencies and build here. Do NOT install dependencies or build locally — everything goes in this script.
- `scripts/start.sh` — Starts the application. MUST bind `0.0.0.0:${PORT:-9000}`. The platform sets `PORT=9000`.
- `.dockerignore` (recommended) — Excludes files from image source upload. Uses `.gitignore`-like matching (`node_modules`, `.next`, `dist`, `*.log`, `!keep`). Missing file uses safe defaults; uploaded source archive must be ≤100MiB.

## Port

The app MUST listen on `0.0.0.0:${PORT:-9000}`. The `PORT` environment variable is set by the platform (default 9000). Do NOT hardcode a different port.

## Remote build

`setup.sh` runs as root in a **Linux** container with `/code` as the working directory. You can use `apt-get`, `pip`, `npm`, `pnpm`, or any package manager. All dependency installation and compilation must happen in this script, not locally. Note: the build environment is Linux — `setup.sh` is not expected to run on the developer's local machine (which may be macOS/Windows).

## Pre-deploy verification

Before running `meoo deploy --runtime image`, the app MUST be verified locally using its own dev/start workflow (e.g. `npm run dev`, `python app.py`, `go run .`). Confirm the server starts successfully and responds to HTTP requests. Do NOT deploy code that hasn't been locally tested.

## Health check

Do NOT use fake HTTP responses or stub servers. The platform runs a health check after deploy — it verifies the app returns a real HTTP response (non-5xx).

## Storage

- No persistent local storage — container instances are ephemeral and may be destroyed at any time. Do NOT use SQLite, local JSON files, or any file-based storage for persistent data. Use cloud services (Supabase via `meoo cloud enable`) for data persistence — see `references/cloud-patterns.md`.

## Cold start

Container instances have cold start latency on first request. Subsequent requests reuse the warm instance.

## Example scripts

### Node.js

```bash
# scripts/setup.sh
#!/bin/sh
cd /code
npm install --production
npm run build
```

```bash
# scripts/start.sh
#!/bin/sh
cd /code
PORT=${PORT:-9000} node server.js
```

### Python

```bash
# scripts/setup.sh
#!/bin/sh
cd /code
pip install -r requirements.txt
```

```bash
# scripts/start.sh
#!/bin/sh
cd /code
PORT=${PORT:-9000} python app.py
```

## Cloud services

Cloud services (Supabase, Edge Functions) work the same regardless of deploy mode. See `references/cloud-patterns.md` for all calling patterns.

Image deploy specific: run `meoo cloud pull-env` to write Supabase connection info to `.env`. This `.env` is bundled with your source upload. The app reads it at startup (e.g. via `dotenv`).

### Auto-injected environment variables

When the project has cloud services enabled (`meoo cloud enable`), the platform automatically injects the following environment variables into the FC container at deploy time — no manual configuration needed:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<accessDomain>/sb-api` |
| `SUPABASE_ANON_KEY` | Project anon key (public, safe for client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project service role key (bypasses RLS, server-side only) |
| `MEOO_PROJECT_API_KEY` | Project API key for calling Meoo AI services |

These are available as `process.env.SUPABASE_URL` etc. in server code without any `.env` file. If you also have a local `.env` from `meoo cloud pull-env`, the platform-injected values take precedence at runtime.

**Security**:
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — only use for trusted server-side operations, never expose to the client.
- `MEOO_PROJECT_API_KEY` — can now be used directly in image deploy server code to call Meoo AI, no longer restricted to Edge Functions.

## Project configuration

After the first successful `meoo deploy --runtime image`, the CLI saves the deploy mode to `.meoo/config.json`:

```json
{
  "runtime": "image"
}
```

Subsequent deploys only need `meoo deploy` — the CLI reads the saved runtime automatically. You can also create this file manually before the first deploy.

## Migrating an existing app

No template migration needed — create the project with `meoo projects create "My App"`, add `scripts/setup.sh` and `scripts/start.sh`, then run `meoo deploy --runtime image`. Ensure the app binds `0.0.0.0:${PORT:-9000}` and fits within resource limits.

Alternatively, start from a template (`meoo init nextjs-app` etc.) and migrate your existing code into it.
