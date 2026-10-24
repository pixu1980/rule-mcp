# 003: React and Express bookmarks manager architecture

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: architecture, react, express, security, design-system
- **Author**: rule-mcp-architect

## Context

New empty repository needs a responsive accessible bookmarks workflow with remote URL metadata extraction and a local-first development experience.

## Decision

Use a pnpm workspace with apps/web for Vite React TypeScript and apps/api for Express TypeScript. Keep API contracts in docs/api/openapi.yaml, implement scraping behind a validated service boundary, and use semantic attribute-based CSS tokens for the UI.

## Consequences

Frontend and backend can evolve independently with shared documented contracts; remote fetching remains server-side and must be hardened against SSRF and hostile HTML; local development uses in-memory bookmark storage.

## Alternatives Considered

1. Single full-stack app
1. Client-side scraping only
1. External scraping SaaS
