# Bookmarks Manager, Session Handoff

## Project Identity

- **Name**: Bookmarks Manager DS4 Flash
- **Stack**: React 19 + Vite + Express 5 + TypeScript
- **Package Manager**: pnpm (workspaces)
- **Design System**: CSS custom properties, Chivo/Inter fonts, proportional scale, dark theme

## Architecture

### Backend (`server/`)

- Express 5 with helmet, cors, compression, Zod validation
- Feature-based modules: `health`, `bookmarks`
- URL scraping via `fetch()` with regex metadata extraction
- Local JSON file storage (`data/bookmarks.json`)
- API versioning: `/api/v1/`
- Port 4000

### Frontend (`client/`)

- React 19 + Vite 6, TypeScript strict mode
- rule-mcp-compliant: zero CSS classes, data-part selectors, adoptedStyleSheets, barrel pattern
- Accessibility: WCAG 2.2 AA, semantic HTML, aria attributes, keyboard navigation
- Components: SearchBar (mega-search), BookmarkCard, EmptyState, LoadingState, Header, NotFound
- react-hook-form + Zod for URL validation
- Port 3000 (proxied to backend)

### Design System (`client/src/design-system.css`)

- Typography: Chivo (display) + Inter (body), proportional scale (0.75-3rem)
- Spacing: 4px-96px grid
- Radii: 4px-24px + full
- Elevation: 5-level shadow system
- Dark theme with oklch color space
- Focus rings, transitions, prefers-reduced-motion

## Key Files

- `server/src/app.ts`, Express app factory
- `server/src/server.ts`, HTTP listener + graceful shutdown
- `server/src/modules/bookmarks/bookmarks.service.ts`, Scraping + CRUD
- `client/src/main.tsx`, App entry with BrowserRouter
- `client/src/design-system.css`, All design tokens
- `client/src/components/SearchBar/_SearchBar.tsx`, Mega-search with react-hook-form
- `client/src/components/BookmarkCard/_BookmarkCard.tsx`, Card with OG image, metadata, delete
- `client/src/hooks/useBookmarks.ts`, State management hook

## ADRs

1. `001-monorepo-structure-and-tech-choices.md`, Stack decisions
2. `002-ui-design-system-tokens.md`, Design tokens
3. `003-url-scraping-architecture.md`, Scraping approach

## Quick Start

```bash
pnpm install
pnpm dev          # Starts both server:4000 + client:3000
```

## Quality Gates

- [x] Server type-checks clean
- [x] Client type-checks clean
- [x] API health check returns 200
- [x] URL scraping returns metadata
- [x] Pagination works with X-Total-Count
- [x] tokensave quality: 10000/10000

## Next Steps

- [ ] Add Playwright + axe-core a11y tests in `client/tests/a11y/`
- [ ] Add Vitest unit tests for server and client
- [ ] Add light theme support
- [ ] Replace JSON file storage with SQLite/PostgreSQL
- [ ] Add bookmark editing and tagging
- [ ] Deploy with Docker
