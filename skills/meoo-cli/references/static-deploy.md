# Static Deploy Constraints

> Applies to **static deploy** projects published to CDN via `meoo deploy`.
> For full-stack apps with a server process, see `image-deploy.md`.

## Hard constraints (platform-level)

Violating ANY of these will break the project. These apply to ALL templates and migrated SPAs.

### Port 3015

Dev server MUST run on port 3015 with `strictPort: true` and `host: '0.0.0.0'`. This is the only port exposed by the Meoo preview system. All templates are pre-configured — never modify the port config.

### No backend servers

NEVER start Express, Koa, Fastify, Flask, Django, FastAPI, or any backend server. If the user's project requires a backend server, switch to image deploy (`meoo deploy --runtime image`) — see `image-deploy.md`. For static deploy, use Meoo Cloud instead:

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

Hash routing ONLY. Never use history mode — CDN serves static files without server-side routing, history mode will 404 on page refresh.

| Template | Router | How to create routes |
|------|----------|----------|
| `react-project` | `react-router-dom` `createHashRouter` | Define `RouteObject[]` manually |
| `react-vite-project` | `react-router-dom` `createHashRouter` | Define `RouteObject[]` manually |
| `react-design` | TanStack Router (file-based) | Create files in `src/routes/`, run `pnpm dev` to auto-generate `routeTree.gen.ts` |
| `vue-project` | `vue-router` `createWebHashHistory` | Define route array manually |

**Route-first principle**: All page transitions, tab navigation, and multi-step flows MUST define URL routes first, then build UI. Every navigable view needs a corresponding Route — do not use component state to replace routing.

**Common mistakes**:
- Using `useState` to switch tab content without defining routes → users cannot navigate to a tab via URL, state lost on refresh
- Manually editing `routeTree.gen.ts` in `react-design` → file is auto-generated, next `pnpm dev` will overwrite
- Using `createBrowserRouter` / `createWebHistory` → CDN cannot handle server-side routing, refresh returns 404

### Package manager

Use `pnpm` exclusively. Never use npm or yarn — they create lock file conflicts.

### Application structure

MUST create a standard multi-file SPA application. NEVER use a single HTML file for the entire app.

---

## Code style rules

> These apply to projects created via `meoo init` (Meoo templates).

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

## Publishing a static page (no build tooling)

For pre-built HTML/CSS/JS that doesn't need a build step:

1. `meoo projects create "My Static Page"`
2. `mkdir -p dist && cp your-page.html dist/index.html`
3. `meoo deploy --skip-build`

This publishes to CDN only. Editor preview/code will be empty — this is expected for static-only deploys.

**Note**: The "NEVER use a single HTML file" constraint applies only to projects developed on the platform (using templates). Static page publishing is a supported lightweight path.
