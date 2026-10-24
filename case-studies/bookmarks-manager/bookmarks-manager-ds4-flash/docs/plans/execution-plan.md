# Execution Plan: Bookmarks Manager DS4 Flash

## Overview

Full-stack bookmark manager: React frontend + Express/TypeScript backend.
Design system: Apple-grade UI with microinteractions, proportional typography, WCAG 2.2 AA a11y.

## Phases

### Phase 1: Foundation & ADRs

- [ ] Git init + tokensave init + first sync
- [ ] ADR 001: Monorepo structure & tech choices
- [ ] ADR 002: UI design system tokens
- [ ] Root workspace config (pnpm-workspace.yaml, tsconfig)

### Phase 2: Backend, Express + TypeScript

- [ ] Server scaffold: app.ts, server.ts, middleware, error handling
- [ ] API module: health endpoint
- [ ] Bookmarks API: CRUD + scrape endpoint
- [ ] Zod validation schemas
- [ ] Graceful shutdown, CORS, helmet, pino logging

### Phase 3: Frontend, React + Vite

- [ ] Vite + React scaffold with rule-mcp file tree
- [ ] Design system: CSS custom properties, typography, spacing, radii, elevation
- [ ] Core components: Input, Button, Card, BookmarkCard, SearchBar
- [ ] Pages: Home, Bookmarks, NotFound
- [ ] API service layer with zod validation
- [ ] A11y tests with Playwright + axe-core

### Phase 4: Integration & Polish

- [ ] Connect frontend to backend
- [ ] Microinteractions (CSS animations, transitions)
- [ ] Error states, loading states, empty states
- [ ] A11y review & final axe-core tests
- [ ] tokensave sync + health check

### Phase 5: Documentation & Handoff

- [ ] ADR 003: URL scraping architecture
- [ ] README.md
- [ ] Handoff document
