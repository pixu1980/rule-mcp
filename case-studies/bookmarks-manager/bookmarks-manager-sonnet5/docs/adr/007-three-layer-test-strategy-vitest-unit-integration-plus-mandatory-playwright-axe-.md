# 007: Three-layer test strategy: Vitest unit/integration plus mandatory Playwright+axe a11y gate

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: testing, accessibility, quality
- **Author**: rule-mcp-architect

## Context

The project must satisfy both general test coverage expectations and the hard rule-styleguide-a11y requirement: every project must ship Playwright + @axe-core/playwright tests under `tests/a11y/`, and CI must fail on any violation.

## Decision

Three layers of automated testing: (1) backend Vitest + supertest integration tests covering validation, SSRF rejection paths (mocked), scraping metadata extraction (pure unit tests on `parseMetadata`), and full CRUD; (2) frontend Vitest + Testing Library unit tests for the composer's client-side URL validation and submit wiring, plus a pure-function test for `formatDomain`; (3) mandatory Playwright + `@axe-core/playwright` accessibility tests under `frontend/tests/a11y/` (`_basic.spec.ts`, `_forms.spec.ts`) asserting zero axe violations, one `<h1>`, no skipped heading levels, a `<main>` landmark, and an `html[lang]` attribute, run via `pnpm test:a11y` with Playwright's `webServer` auto-booting the Vite dev server.

## Consequences

Positive: the a11y suite caught 3 real WCAG AA color-contrast violations during development (excerpt/footer subtle text and the accent-on-white submit button) that were fixed by adjusting design tokens before hand-off, proof the gate works. Negative: the a11y suite currently exercises only the frontend's static/loading states (no backend running in CI), so interaction paths that depend on real scraped data are not covered by axe yet; documented as a follow-up alongside a full E2E suite.

## Alternatives Considered

1. Skip a11y automation and rely on manual review (rejected: explicitly forbidden by rule-styleguide-a11y, which treats this as a CI-blocking requirement)
1. Jest + Testing Library only, no Playwright (rejected: does not satisfy the mandated axe-core browser-level scan)
1. End-to-end tests against the full stack including the real backend (deferred: the a11y suite intentionally only boots the frontend dev server; a future E2E suite can add the backend and real network calls)
