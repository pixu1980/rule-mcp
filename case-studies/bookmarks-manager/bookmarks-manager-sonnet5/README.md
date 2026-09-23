# Bookmarks Manager

Paste a link, get it saved instantly with its title, Open Graph preview
image, favicon and a short text excerpt — no manual tagging required.

A pnpm-workspace monorepo built to the [rule-mcp](https://github.com/rule-mcp)
skill set: zero-CSS-class React frontend (element + `data-part` selectors
only, `adoptedStyleSheets`, WCAG 2.2 AA), and a layered Express/TypeScript
API that scrapes a submitted URL behind an SSRF guard.

```
bookmarks-sonnet5/
├── frontend/     React 18 + Vite + TypeScript SPA
├── backend/      Express 4 + TypeScript API (in-memory store)
├── docs/adr/     Architecture Decision Records
└── docs/handoff/ End-of-session handoff notes
```

## Quick start

Requires Node ≥20 and `pnpm` (`corepack enable` if you don't have it yet).

```bash
pnpm install

# terminal 1 — API on http://localhost:3002
cp backend/.env.example backend/.env
pnpm --filter ./backend dev

# terminal 2 — SPA on http://localhost:3001 (proxies /api to :3002)
pnpm --filter ./frontend dev
```

Open http://localhost:3001, paste any article/product/video URL into the
composer, and the card grid updates with the scraped preview.

## Testing

```bash
pnpm --filter ./backend test     # Vitest — unit + supertest integration
pnpm --filter ./frontend test    # Vitest + Testing Library — unit
pnpm --filter ./frontend test:a11y   # Playwright + @axe-core — WCAG 2.2 AA gate
```

The a11y suite is mandatory per `rule-styleguide-a11y` and boots its own
Vite dev server (`playwright.config.ts` → `webServer`), so it can run
standalone: `cd frontend && pnpm exec playwright install chromium && pnpm test:a11y`.

## API surface

See [`backend/api/openapi.yaml`](backend/api/openapi.yaml) for the full
OpenAPI 3.1 contract. Summary:

| Method | Path                    | Purpose                                  |
|--------|-------------------------|-------------------------------------------|
| POST   | `/api/v1/bookmarks`     | Scrape a URL and save it as a bookmark    |
| GET    | `/api/v1/bookmarks`     | Paginated list (`offset`/`limit`), newest first, `X-Total-Count` header |
| GET    | `/api/v1/bookmarks/:id` | Fetch a single bookmark                  |
| DELETE | `/api/v1/bookmarks/:id` | Delete a bookmark                        |

Errors always have the shape:

```json
{ "statusCode": 400, "correlationId": "...", "errors": [{ "code": "URL_NOT_ALLOWED", "message": "..." }] }
```

## Security highlights

- **SSRF guard** (`backend/src/common/utils/ssrfGuard.ts`): http(s)-only,
  `localhost` rejected, hostname resolved via DNS and checked against
  `ipaddr.js` — only publicly-routable (`unicast`) addresses are allowed.
- **Bounded scraping**: request timeout, streamed byte cap, `content-type`
  allowlist (HTML only).
- **Rate limiting** on the expensive `POST /bookmarks` route.
- **helmet**, explicit **CORS** origin allowlist, `zod` validation on every
  external input, centralized error handler that never leaks internals.

## Design system

All design decisions are tokenized in `frontend/src/styles/tokens.css`:
a 1.25 modular type scale, a geometric spacing scale, 5-step radii and
elevation, two motion durations + one easing curve, and an OKLCH
neutral+accent palette with a `prefers-color-scheme: dark` override. Every
component's CSS lives in an external `_Component.css` file adopted via
`document.adoptedStyleSheets` — no CSS classes, no inline styles, anywhere.

## Documentation

- [`docs/adr/`](docs/adr/) — architecture decisions, numbered and dated.
- [`docs/handoff/`](docs/handoff/) — end-of-session context for the next
  agent or engineer.
- [`backend/api/openapi.yaml`](backend/api/openapi.yaml) — API contract.

## Known limitations (POC scope)

- Bookmarks are stored in-memory and reset when the backend restarts (see
  ADR 006 — the repository module isolates the swap to a persistent store).
- No auth/multi-user support.
- a11y automation currently covers the frontend's static/loading states
  only (no live backend in the Playwright run) — see ADR 007.
