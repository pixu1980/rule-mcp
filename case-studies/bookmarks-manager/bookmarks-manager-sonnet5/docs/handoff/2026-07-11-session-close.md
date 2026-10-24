# Session Handoff, Bookmarks Manager POC

_Session date: 2026-07-11 - Author: agent session (sonnet5)_

## What was built

A pnpm-workspace monorepo implementing a bookmarks manager:

- **`frontend/`**, React 18 + Vite + TypeScript SPA. Paste-a-link composer
  ("mega-search" pattern), staggered card grid with skeleton loading state,
  empty state, accessible toast/live-region feedback. Zero CSS classes,
  every rule-mcp targets an element tag or `[data-part]`/`[data-*]` attribute,
  loaded via `adoptedStyleSheets` (see `hooks/useAdoptedStylesheet.ts`).
  Full design-system token layer in `src/styles/tokens.css`.
- **`backend/`**, Express 4 + TypeScript API. `POST /api/v1/bookmarks`
  scrapes a submitted URL (SSRF-guarded fetch -> cheerio metadata
  extraction: Open Graph tags, favicon, text excerpt) and persists it in
  an in-memory repository. Centralized error handling, zod validation,
  rate limiting on the scrape endpoint, helmet, CORS allowlist.
- **`docs/adr/`**, 7 ADRs (001-002 auto-logged by tool calls, 003-007
  hand-authored) covering monorepo layout, SSRF-guarded scraping, the
  zero-CSS-class design system, backend layering, and the test strategy.
- Test suites: 8 backend Vitest/supertest tests, 7 frontend Vitest tests,
  8 Playwright + axe-core a11y tests (**all passing, zero axe
  violations**).

## Verified working end-to-end

- `pnpm build` passes for both packages (tsc + vite build).
- `pnpm test` passes for both packages (8 + 7 tests).
- `pnpm test:a11y` (frontend) passes 8/8 with zero WCAG AA violations.
- Manually verified real scraping against `https://example.com` and
  `https://www.wikipedia.org` through the Vite dev proxy, OG image,
  favicon, title, description and text excerpt all extracted correctly.
- Manually verified the SSRF guard rejects `http://localhost:3002/...`
  and `http://127.0.0.1/` with `400 URL_NOT_ALLOWED`.

## Ports and processes (dev)

- Backend: `http://localhost:3002` (see `backend/.env`, copied from
  `.env.example`; **not committed to git**).
- Frontend: `http://localhost:3001` (Vite dev server, proxies `/api` to
  `:3002`, see `frontend/vite.config.ts`).
- Both were left running in the background at the end of this session
  (`pnpm --filter ./backend dev`, `pnpm --filter ./frontend dev`).
  If they're not running when you resume: `pnpm install` at the repo
  root, then start each with the commands above (backend needs
  `backend/.env` present, copy from `.env.example` if missing).

## Gotchas discovered this session (already fixed, documented here so they aren't re-introduced)

1. **Stale `vite.config.js`**, running `tsc -b` with a `tsconfig.node.json`
   that included `vite.config.ts` emitted a compiled `vite.config.js`
   alongside it; Vite silently preferred the compiled `.js` over the
   `.ts` source, so port/proxy changes appeared to have no effect. Fixed
   by dropping the TS project reference for `vite.config.ts` entirely
   (build script is now `tsc -p tsconfig.json && vite build`) and
   git-ignoring `vite.config.js`/`*.tsbuildinfo`.
2. **`pino-http` + `moduleResolution: NodeNext`**, TS resolved the
   default export as a non-callable namespace under `NodeNext`
   resolution. Fixed by switching the backend to
   `module: ESNext` / `moduleResolution: Bundler` (emitted JS is
   unaffected; Node still runs it fine as ESM because
   `backend/package.json` has `"type": "module"`).
3. **`.env` isn't auto-loaded by `tsx watch`**, added the `dotenv`
   dependency and `import "dotenv/config"` at the top of `server.ts`.
4. **jsdom lacks `adoptedStyleSheets`/`CSSStyleSheet.replaceSync`**,
   polyfilled in `frontend/src/setupTests.ts`.
5. **RTL auto-cleanup didn't trigger under explicit Vitest imports**,
   added an explicit `afterEach(cleanup)` in `setupTests.ts`.
6. **Color-contrast failures caught by the mandatory a11y suite**, the
   original OKLCH accent/neutral tokens failed WCAG AA 4.5:1 for small
   text and for white-on-accent button text. Fixed by darkening
   `--color-ink-subtle` (light theme) and splitting the accent into
   `-500` (borders/focus only) / `-600` (solid-fill/text) / `-700`
   (hover), see ADR 005 and `tokens.css`.
7. **Per-card animation stagger** originally used an inline
   `style={{ '--card-index': i }}`, which violates the zero-inline-style
   guardrail. Replaced with `:nth-child` selectors in
   `_BookmarkGrid.css`.

## Known limitations / suggested next steps

- **Persistence**: bookmarks live in an in-memory `Map` and reset on
  backend restart (ADR 006). Swap `bookmarks.repository.ts` for a real
  store (SQLite is the lowest-friction next step) before this goes
  beyond POC.
- **a11y coverage gap**: the Playwright a11y suite only exercises the
  frontend's static/loading states (no backend running in that job),
  see ADR 007. A follow-up E2E suite should boot both processes and
  scan the populated card grid too.
- **`tokensave_health` quality signal: 6987/10000.** Acyclicity,
  modularity and coverage-discipline all score well (>=0.98); the
  weakest dimension is `equality` (0.23, "extreme inequality",
  expected for a POC with a handful of larger files like
  `scrape.service.ts` and `tokens.css` next to many small ones) and
  `redundancy` flags 115/459 "dead" functions, which is almost entirely
  barrel re-exports (`index.ts` files) and type-only exports that have
  no direct call edge in the graph, not actual dead code, but worth a
  second look if the codebase grows.
- **Dockerfile** exists for the backend only; add one for the frontend
  (static build served via nginx or similar) before any real deployment.
- **DNS-rebinding**: the SSRF guard re-resolves DNS immediately before
  fetching, narrowing but not eliminating the rebinding window (documented
  in ADR 004). Pinning the resolved IP into the fetch call would close
  this fully but isn't exposed by the global `fetch` API without a custom
  `dns.lookup`-aware agent.

## Where to look first next session

1. `docs/adr/`, full decision log (numbered, dated, with alternatives).
2. `README.md`, quick start, API summary, security highlights.
3. `backend/api/openapi.yaml`, API contract.
4. This file for anything not yet promoted to an ADR.
