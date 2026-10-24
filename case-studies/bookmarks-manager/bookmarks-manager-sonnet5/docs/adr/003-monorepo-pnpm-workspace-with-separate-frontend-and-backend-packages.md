# 003: Monorepo pnpm workspace with separate frontend and backend packages

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: architecture, tooling, monorepo
- **Author**: rule-mcp-architect

## Context

The bookmarks manager needs an independently deployable React SPA and an Express/TypeScript API. Both must share a version-controlled history, coordinated tooling (lint, format, test) and be developed together during a single POC session, without coupling their runtime or build output.

## Decision

Use a single git repository with pnpm workspaces (`frontend/`, `backend/`), a root `package.json` orchestrating `dev`/`build`/`test`/`lint` across both via `pnpm --filter`, and a `pnpm-workspace.yaml`. Each package owns its own `tsconfig.json`, `.eslintrc.json`, dependencies and test runner (Vitest in both, Playwright+axe added to the frontend only).

## Consequences

Positive: one `pnpm install` bootstraps everything, shared root scripts, no dependency duplication concerns since pnpm hoists per-package. Negative: the two packages still deploy as separate artifacts (SPA static bundle + Node process), so this is not a true single-deployable monolith, acceptable for a POC, revisit with a proper build/deploy pipeline (Docker Compose or Turborepo) before production.

## Alternatives Considered

1. Single Express app serving server-rendered pages (rejected: user asked for a decoupled React frontend)
1. Two separate git repositories (rejected: adds cross-repo coordination overhead with no benefit at POC scale)
1. npm/yarn workspaces (rejected: project-wide convention mandates pnpm/pnpx)
