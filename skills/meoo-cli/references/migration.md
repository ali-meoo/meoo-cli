# Migrating an existing project to Meoo

If the user already has a project and wants to deploy it on Meoo, do NOT run `meoo init` — it will overwrite existing code.

## Choose your migration path

| Your project | Deploy mode | Action |
|---|---|---|
| React/Vue SPA (no server process) | Static deploy | Continue reading below |
| Full-stack app (Express, FastAPI, Next.js SSR, Go, etc.) | Image deploy | See `image-deploy.md` — just add `scripts/setup.sh` + `scripts/start.sh` |

## Step 0: Compatibility check (static deploy)

| ✅ Static deploy | ➡️ Use image deploy instead |
|---|---|
| React SPA (CRA, Vite) | Next.js / Remix (SSR) |
| Vue SPA (Vite) | Nuxt (SSR) |
| Any static-output SPA | Django / Flask / FastAPI / Express |
| Frontend + separate API calls | Go / Rust / Java web app |

Left column: follow this guide for static deploy migration. Right column: use image deploy — no template migration needed, just add `scripts/setup.sh` and `scripts/start.sh`, then `meoo deploy --runtime image`. See `image-deploy.md`.

## Step 1: Adapt build config

**Vite** — modify `vite.config.ts`:

```ts
export default defineConfig({
  base: './',
  server: {
    port: 3015,
    strictPort: true,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 1024 * 1024,
  },
})
```

**Webpack** — modify `webpack.config.js`:

```js
module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: './',
  },
  devServer: {
    port: 3015,
    host: '0.0.0.0',
    allowedHosts: 'all',
  },
}
```

Key values: port `3015`, base/publicPath `'./'`, output to `dist/`, entry must be `dist/index.html`.

## Step 2: Switch to hash routing

Meoo CDN serves static files — no server-side routing support. MUST use hash mode.

**React Router v6+**:
```tsx
// Before
import { createBrowserRouter } from 'react-router-dom';
const router = createBrowserRouter(routes);

// After
import { createHashRouter } from 'react-router-dom';
const router = createHashRouter(routes);
```

**Vue Router**:
```ts
// Before
import { createWebHistory } from 'vue-router';
const router = createRouter({ history: createWebHistory(), routes });

// After
import { createWebHashHistory } from 'vue-router';
const router = createRouter({ history: createWebHashHistory(), routes });
```

## Step 3: Switch to pnpm

```bash
rm -f package-lock.json yarn.lock
pnpm install
```

## Step 4: Migrate backend logic (if any)

If the project has API routes (Express/Koa/etc.), you have two options:

**Option A — Static deploy + Edge Functions**: Migrate each endpoint to a Meoo Edge Function:

```
原来: server/api/users.ts (Express route)
迁移: functions/get-users/index.ts (Deno Edge Function)
```

Edge Function 结构:
```ts
import { serve } from 'https://deno.land/std/http/server.ts';

serve(async (req) => {
  // 原来 Express handler 的逻辑搬过来
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

部署: `meoo fn deploy get-users`

前端把 API 调用地址从 `localhost:3000/api/users` 改为 Edge Function URL。详见 `cloud-patterns.md`。

**Option B — Image deploy**: Keep your backend as-is and use image deploy instead. See `image-deploy.md`.

## Step 5: Connect to Meoo platform

```bash
meoo login                      # 1. Authenticate
meoo projects create "My App"   # 2. Create remote project (no init needed)
meoo cloud enable               # 3. Provision cloud services (if needed)
meoo cloud pull-env             # 4. Pull Supabase keys to .env (if using cloud)
pnpm dev                        # 5. Verify locally on port 3015
meoo deploy                     # 6. Build and publish
```

## Migration checklist

Before deploying, verify all items:

- [ ] `base` / `publicPath` is `'./'` (not `/` or absolute URL)
- [ ] Dev server port is `3015` with `strictPort: true`
- [ ] Routing is hash mode (URL has `#`)
- [ ] No backend server process — if your project needs one, use image deploy instead
- [ ] Build output is `dist/index.html`
- [ ] Using pnpm (no package-lock.json or yarn.lock)
- [ ] No external CDN links for JS/CSS (all bundled)
- [ ] `pnpm run build` succeeds locally
- [ ] `meoo projects create` has been run
