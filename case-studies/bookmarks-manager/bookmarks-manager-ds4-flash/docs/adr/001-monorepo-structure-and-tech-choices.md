# ADR 001: Monorepo Structure and Technology Choices

## Status

Accepted

## Context

We need to build a bookmarks manager with a React frontend and Node/Express backend.
The project must follow rule-mcp standards: barrel files, data-part selectors, zero CSS classes,
semantic HTML, a11y-first, and consistent design system.

## Decision

- **Monorepo** with pnpm workspaces (`server/`, `client/`)
- **Backend**: Express 5 + TypeScript, Zod validation, Pino logging, Helmet security
- **Frontend**: React 18 + Vite + TypeScript, react-hook-form + Zod
- **Design System**: CSS custom properties, proportional scale, adoptedStyleSheets
- **A11y**: WCAG 2.2 AA, Playwright + axe-core tests
- **Storage**: Local filesystem JSON (MVP), easy to swap for PostgreSQL later
- **API versioning**: URI-based `/api/v1/`
- **No CSS classes, no inline styles, no Tailwind**, rule-mcp compliant

## Consequences

- Easy to add new features without restructuring
- Consistent API contracts between frontend and backend
- pnpm workspace enables shared types in the future
