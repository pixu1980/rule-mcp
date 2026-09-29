# Bookmarks Manager DS4 Flash

> Full-stack bookmark manager with AI-powered scraping, Apple-grade UI, and rule-mcp compliance.

## Tech Stack

| Layer    | Technology                         |
| -------- | ---------------------------------- |
| Frontend | React 19, Vite 6, TypeScript       |
| Backend  | Express 5, TypeScript, Zod         |
| Design   | CSS custom properties, Chivo/Inter |
| Tools    | pnpm workspaces, Biome             |
| A11y     | WCAG 2.2 AA, semantic HTML         |

## Quick Start

```bash
pnpm install
pnpm dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000/api/v1

## Project Structure

```
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Barrel-pattern UI components
│   │   │   ├── App/
│   │   │   ├── BookmarkCard/
│   │   │   ├── SearchBar/   # Mega-search input
│   │   │   ├── Header/
│   │   │   ├── EmptyState/
│   │   │   └── LoadingState/
│   │   ├── pages/           # Route pages
│   │   │   ├── Home/
│   │   │   └── NotFound/
│   │   ├── hooks/           # React hooks
│   │   ├── services/        # Typed API client
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Helpers
│   │   └── design-system.css # All CSS tokens
│   └── tests/a11y/          # Playwright + axe-core (TODO)
├── server/                  # Express backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── health/      # Health check
│   │   │   └── bookmarks/   # CRUD + scraping
│   │   ├── common/
│   │   │   ├── middleware/  # Error handler
│   │   │   ├── errors/     # AppError
│   │   │   └── types/      # Shared types
│   │   ├── app.ts          # Express factory
│   │   ├── server.ts       # HTTP listener
│   │   └── logger.ts       # Pino logger
│   └── data/               # JSON storage
├── docs/
│   ├── adr/                # Architecture Decision Records
│   ├── plans/              # Execution plan
│   └── handoff.md          # Session handoff
└── pnpm-workspace.yaml
```

## API Endpoints

| Method | Path                    | Description                       |
| ------ | ----------------------- | --------------------------------- |
| GET    | `/api/v1/health`        | Health check                      |
| GET    | `/api/v1/bookmarks`     | List bookmarks (paginated)        |
| POST   | `/api/v1/bookmarks`     | Create bookmark (triggers scrape) |
| DELETE | `/api/v1/bookmarks/:id` | Delete bookmark                   |

## Design System

- **Dark theme** with oklch color space
- **Typography**: Chivo (display, weights 400–900) + Inter (body)
- **Spacing**: Proportional 4px grid
- **Elevation**: 5-level layered shadow system
- **Motion**: 200–400ms cubic-bezier transitions, respects `prefers-reduced-motion`
- **Focus**: High-contrast rings with `:focus-visible`

## ADRs

- [001: Monorepo & Tech Stack](./docs/adr/001-monorepo-structure-and-tech-choices.md)
- [002: UI Design System](./docs/adr/002-ui-design-system-tokens.md)
- [003: URL Scraping Architecture](./docs/adr/003-url-scraping-architecture.md)
