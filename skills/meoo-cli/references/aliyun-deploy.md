# Aliyun Deploy (User's Own Alibaba Cloud Account) Reference

`meoo aliyun <subcommand>` deploys a local project (or a Git repo URL) to the **user's own Alibaba Cloud account** — real ECS/RDS/SLB resources billed directly to that account, provisioned via an Alibaba Cloud ROS (Resource Orchestration Service) stack.

**This is architecturally distinct from `meoo deploy`** (static/image deploy, both covered above). `meoo deploy` publishes to Meoo's own managed infrastructure (CDN or FC container) — Meoo owns the billing and the runtime. `meoo aliyun deploy` provisions infrastructure directly inside the user's Alibaba Cloud account — the user owns the billing, the VMs, and is responsible for their own maintenance/security. Do NOT confuse the two; do NOT suggest `meoo aliyun` for a user who just wants a normal Meoo-hosted deploy, and do NOT suggest `meoo deploy` when the user explicitly asks to deploy into their own cloud account.

`meoo aliyun *` commands do NOT require `meoo login` (`withoutAuth: true`) — they need a working local `aliyun` CLI installation instead. They are NOT part of the "three deployment targets" table above; treat them as a fourth, separate target: **your own Alibaba Cloud account**.

## When to use this guide

Use `meoo aliyun` when the user explicitly says something like:
- "部署到我自己的阿里云账号" / "deploy to my own Alibaba Cloud account"
- "用 ECS/RDS 跑这个项目，费用我自己出" — wants real VMs they control, not Meoo's managed container
- They already have an `aliyun` CLI configured and want infra provisioned in their account

Do NOT use this guide for normal Meoo-hosted deploys (static CDN or FC container) — those go through `meoo deploy` / `meoo deploy --runtime image` and are documented above / in `references/image-deploy.md`.

## Prerequisite: aliyun CLI

Unlike `meoo deploy`, Meoo does not manage this infrastructure. The user's machine must have:
- `aliyun` CLI v3.x or later installed (`brew install aliyun-cli` on macOS)
- A configured profile with valid AccessKey/Secret (`aliyun configure`) with permissions for ECS/RDS/SLB/ROS/OSS/STS
- A default region set (`aliyun configure set --region cn-hangzhou`)

Always run `meoo aliyun doctor` first — it checks CLI presence/version, profile validity, region configuration, `ros`/`ecs`/`oss` subcommand availability, and identity (`sts GetCallerIdentity`). If it fails, fix the reported issue before attempting `deploy` — do not try to work around a failed doctor check.

```bash
meoo aliyun doctor                 # Environment precheck
meoo aliyun doctor --profile <name>
```

## Command reference

All commands support `--json`. Run `meoo aliyun <sub> --help` for the full flag list.

### `meoo aliyun deploy` — full provisioning + deploy

```bash
meoo aliyun deploy [--git <url>] [flags...]
```

Runs a 14-step orchestration: env check → (optional) git clone + build → project analysis → existing-deployment check → DB detection → topology/instance selection → template generation → stock check → upload+validate+cost estimate+confirm → build/upload real artifacts → create ROS stack → wait for completion → health check → save state. Every step prints a numbered progress line (✓ done / ⏭ skipped / ✗ failed) even when skipped, so the user can see the full sequence.

Key flags:

| Flag | Purpose |
|---|---|
| `--git <url>` | Deploy from a Git repo URL instead of the local cwd (shallow clone to a temp dir, auto-cleaned after) |
| `--region <region>` | Region ID (default: the `aliyun` CLI's configured default region) |
| `--profile <name>` | Use a specific `aliyun` CLI profile |
| `--app-name <name>` / `--app-desc <desc>` | Override auto-inferred app metadata |
| `--app-type <type>` | Override auto-detected project type: `docker`/`binary-go`/`binary-java`/`binary-node`/`binary-python`/`frontend-only` |
| `--topology <t>` | `single` (1 ECS, default) or `ha` (2 ECS across zones + SLB) |
| `--instance-type <type>` | ECS spec (default: the "通用型 2C4G" tier, `ecs.e-c1m2.large`) |
| `--with-rds` / `--no-rds` | Force RDS MySQL on/off — **overrides** auto-detected DB signals in both directions |
| `--db-instance-class <class>` | RDS spec (default: "入门型 1C2G", `mysql.n2e.small.1`) |
| `--frontend-dir <dir>` / `--backend-dir <dir>` | Override auto-detected artifact directories |
| `--backend-entry <cmd>` | Override the auto-inferred backend start command |
| `--backend-port <port>` | Backend listen port (default depends on app type, commonly 8080 — **not** the 9000 default used by `meoo deploy --runtime image`; the two deploy paths have independent port conventions, see `references/image-deploy.md`'s Port section) |
| `--nginx-mode <mode>` | Override: `static-proxy` (frontend+backend) / `proxy` (backend-only) / `static` (frontend-only) |
| `--build` | Also run the deterministic build command for local (non-git) projects before packaging |
| `--force` / `--yes` | Skip all confirmation prompts EXCEPT the cost disclosure block itself (which always prints) |
| `--show-password` | Echo the auto-generated ECS/DB password in the final summary (default: never echoed, only written to the local secrets file) |

**Project type detection** (`analyzeProject.ts`) is a deterministic rule table, not an LLM judgment — Dockerfile/compose → `docker`; `go.mod` → `binary-go` (entry `./server`); `Cargo.toml` → `binary-go` (entry `./target/release/<crate>`, Rust reuses the binary runtime); `pom.xml`/`build.gradle` → `binary-java` (entry `java -jar app.jar`); `package.json` + express/fastify/koa/nest → `binary-node` (entry `node server.js`); `package.json` with only frontend framework deps and no backend signal → `frontend-only`; `requirements.txt`/`pyproject.toml` → `binary-python`, further refined by framework signal (FastAPI → `uvicorn main:app --host 0.0.0.0 --port 8080`; Flask → `gunicorn -b 0.0.0.0:8080 app:app`; Django → `gunicorn` with a guessed wsgi module name; Streamlit/Gradio → their own run commands, Gradio defaults to port 7860). If a project's actual entry file doesn't match these defaults (e.g. FastAPI app in `app.py` instead of `main.py`), pass `--backend-entry` explicitly — this is expected, not a bug. When nothing matches, `deploy` prompts an interactive selection instead of guessing.

**Password handling — never via CLI flag.** ECS/DB passwords are collected in one of these ways, in priority order:
1. `MEOO_ALIYUN_ECS_PASSWORD` / `MEOO_ALIYUN_DB_PASSWORD` environment variables
2. Interactive masked prompt (leave empty to auto-generate)
3. `--force`/non-interactive: auto-generated (16 chars, guaranteed upper/lower/digit/special from a shell-safe charset `!@%^*+=_-`, excludes `& # $ | ;` which would break the remote `db.env` shell-sourcing)

Pressing Ctrl-C during the password prompt aborts the whole deploy immediately (before any stack is created) — it does NOT silently fall back to an auto-generated password. Generated/entered passwords are written to `.meoo-aliyun-deploy.local.json` (mode `0600`) and never echoed to stdout unless `--show-password` is passed.

**Cost disclosure is mandatory and NOT skippable** — even with `--force`, the resource list + hourly price + monthly estimate (hourly × 730) is always printed before the "create billable resources" confirmation. Only the confirmation prompt itself is skippable via `--force`/`--yes`.

**RDS MySQL** is the only auto-provisionable database engine. If Postgres/Redis/MongoDB signals are detected instead, `deploy` just prints a note that only MySQL is supported and continues without provisioning anything — the user must configure that database themselves.

### `meoo aliyun estimate` — pricing preview only

```bash
meoo aliyun estimate [--topology single|ha] [--with-rds] [--instance-type <t>] [--db-instance-class <c>] [--region <r>] [--profile <p>] [--app-type <t>] [--backend-port <p>]
```

Runs template generation + stock check + template upload/validate + `GetTemplateEstimateCost`, but never creates a stack, ECS instance, or RDS instance — only a short-lived temp OSS bucket for the template file. Use this to answer "how much would this cost?" without provisioning anything. Prints hourly price and a 730-hour monthly estimate; explicitly excludes traffic/storage/log overage costs.

### `meoo aliyun check-stock` — zone availability check

```bash
meoo aliyun check-stock [--instance-type <t>] [--min-zones <n>] [--db-instance-class <c>] [--region <r>] [--profile <p>]
```

Note: this command has **no `--topology` flag** — for HA testing translate `--topology ha` mentally into `--min-zones 2`. `--instance-type` defaults to `ecs.e-c1m2.large`; `--min-zones` defaults to `1`. When `--db-instance-class` is also given, it checks the ECS∩RDS zone intersection (not just ECS availability alone) — this is the same check `deploy` runs internally before creating any billable resource for HA and/or RDS combos. A genuine `ok: false` here (e.g. an RDS tier with zero zone overlap with the chosen ECS type in a given region) is a real Alibaba Cloud stock/region limitation, not a bug — try a different `--db-instance-class`, `--instance-type`, or `--region`.

### `meoo aliyun update` — hot update (zero-downtime)

```bash
meoo aliyun update [--backend-url <tar.gz-url>] [--frontend-url <tar.gz-url>] [--profile <p>]
```

`--backend-url`/`--frontend-url` are both optional. If neither is given, `update` automatically re-packages the local project directories (from `frontend_dir`/`backend_dir` recorded in `.meoo-aliyun-deploy.json` at deploy time, or the same auto-detected defaults `deploy` uses) and uploads them to the `artifact_bucket` recorded in that same state file — no need to manually generate signed URLs for the common case of "I changed some code, ship it." Pass explicit URLs only when you want to update from a pre-built artifact elsewhere.

Reads the local `.meoo-aliyun-deploy.json` state file to find the ECS instance IDs, topology, and app type, then runs a remote script via ECS RunCommand. The remote script branches by app type:
- **binary apps** (`binary-go`/`binary-java`/`binary-node`/`binary-python`): downloads to a staging dir, verifies archive integrity, (Python/Node) pre-installs dependencies in the background, atomically swaps in the new build under `/opt/meoo-app`, restarts the `meoo-app` systemd service, health-checks, and auto-rolls-back via an `ERR` trap on failure.
- **`docker` app type, `docker-image` mode**: downloads the new `docker save` tarball, tags the currently-running image as a rollback backup, `docker load`s the new image (same tag), restarts the `meoo-app` systemd unit (which runs `docker run ... ${IMAGE_NAME}`), health-checks, and on failure re-tags the backup image back onto the running tag.
- **`docker` app type, `docker-compose` mode**: downloads the new compose bundle to a staging dir, runs `docker compose build` there (service unaffected), then atomically swaps the compose directory, `docker compose down` the old stack, `docker compose up -d` the new one, health-checks, and rolls back the directory swap on failure.
- Frontend updates (any app type) always go through a separate staged swap of `/var/www/frontend` + `nginx reload`, independent of the backend branch above.

HA topology updates instances one at a time (rolling); single topology updates the one instance directly. Updates `current_artifact_urls`/`previous_artifact_urls`/`updated_at` in the state file on success — this is what `rollback` reads from.

### `meoo aliyun rollback` — revert to the previous artifact version

```bash
meoo aliyun rollback [--yes] [--profile <p>]
```

Equivalent to `update` but sources URLs from the state file's `previous_artifact_urls` instead of new flags. Prompts `确认要回滚到上一版本吗？` unless `--yes`. Fails if there is no previous version recorded (i.e., `update` has never been run).

### `meoo aliyun status` — current deployment info

```bash
meoo aliyun status [--refresh] [--profile <p>]
```

Reads `.meoo-aliyun-deploy.json` and prints topology, region, app type, public IP, ECS instance IDs, SLB ID (HA only), DB connection info (RDS only), current artifact URLs, and timestamps. `--refresh` also does a live (short-timeout) `GetStack` call against ROS to show the current live stack status alongside the locally recorded state.

### `meoo aliyun delete` — tear down all resources

```bash
meoo aliyun delete [--yes] [--profile <p>]
```

Deletes the ROS stack (which cascades to ECS/RDS/SLB/EIP), then attempts to clean up the temp OSS bucket, then removes the local state file. Without `--yes`, requires literally typing `DELETE` to confirm (`promptTypedConfirm`) — a plain y/N is not accepted for this destructive action. If the OSS bucket cleanup fails partway, it is not treated as fatal — the bucket's 7-day lifecycle rule expires it automatically, and the CLI says so. Always advise the user to double check the Alibaba Cloud console after delete to confirm no billable resources remain — this is the single most important verification step for this entire feature.

## State files

- `.meoo-aliyun-deploy.json` — deployment state (stack ID, region, topology, app type, backend mode/image name/port, frontend/backend source dirs, artifact bucket, outputs, artifact URLs, timestamps). Tagged internally with `{Key: "from", Value: "meoo-aliyun"}`. Safe to commit (no secrets), but typically left untracked like other local state. The `backend_mode`/`backend_image_name`/`backend_port`/`frontend_dir`/`backend_dir`/`artifact_bucket` fields are what `update`'s auto-repack path uses to reconstruct the correct upload without any new flags.
- `.meoo-aliyun-deploy.local.json` — ECS/DB passwords, mode `0600`, auto-appended to `.gitignore`. NEVER commit this file. `delete` removes both files on success.

A `provisional: true` state is written immediately after `CreateStack` returns a `StackId` (before waiting for completion) specifically to avoid orphaned stacks — if the process is killed mid-deploy, `meoo aliyun status`/`delete` can still find and clean up the stack.

## Health checks

Two-tier check against the public IP after stack creation: first `/healthz` (served directly by nginx, proves the instance/network path is up regardless of app state), then `/` (proves the actual app process started, for projects with a backend). Cold start on a fresh instance (installing nginx + a language runtime + dependencies) can take several minutes, especially on the cheapest instance tier or on slow networks — the check retries for ~7.5 minutes before giving up.

**A health-check timeout is not the same as a broken deployment, and does not mean the state file is incomplete.** The full state (with the real `public_ip`/`ecs_instance_ids` outputs) is written *before* the health check runs, specifically so that a slow-but-fine cold start can never leave the deployment stuck in the sparse `provisional` shape that `meoo aliyun update` refuses to touch. If you see `HEALTH_CHECK_FAILED`, the resources exist, are billing, `meoo aliyun status`/`update`/`rollback` all work normally against them, and — importantly — the app may simply still be starting up. Before assuming anything is actually broken: manually `curl http://<publicIp>/healthz` and `curl http://<publicIp>/` yourself (the app may come up moments after the CLI's own retry budget expires), or check the remote logs (`/var/log/meoo-aliyun-bootstrap.log`, `/var/log/meoo-aliyun-app.log`) via `meoo aliyun status --refresh`. Only run `meoo aliyun delete` once you've confirmed via one of these that the app is genuinely not responding — don't tear down a perfectly healthy, paying-for-itself instance based on the timeout message alone.

## Relationship to "Known limitations" above

The "No rollback" / "No preview deployments" bullets in this skill's Known Limitations section describe the **Meoo-platform deploy path** (`meoo deploy`) only. `meoo aliyun` is different: `meoo aliyun rollback` provides genuine rollback to the previous artifact version, and `meoo aliyun estimate` provides a genuine pricing preview before any resource is created. Do not apply those two bullets to `meoo aliyun`.
