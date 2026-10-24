# 006: Layered Express backend with zod validation, stable error contract, and in-memory repository

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: backend, architecture, api-design
- **Author**: rule-mcp-architect

## Context

rule-mcp-backend-express and rule-mcp-backend-api-design mandate a feature-based, layered structure (`routes → handlers → services → repositories`), zod validation at the edge, a centralized error handler with a stable JSON error contract, and OpenAPI documentation.

## Decision

The backend is organized as `modules/bookmarks/{router,controller,service,repository,schema,types}.ts` plus a shared `common/` (errors, middleware, utils) and a standalone `scraping/` module. Zod schemas validate `req.body`/`req.query`/`req.params` in the controller before any service call. All operational failures throw `AppError(statusCode, code, message)`, caught by a single 4-arg `errorHandler` that shapes every error response as `{ statusCode, correlationId, errors: [{ code, message }] }`, matching `api/openapi.yaml`. The repository is an in-memory `Map` behind a narrow function-based interface (`insert/list/findById/remove/findByUrl`), chosen deliberately over a real database for this POC to keep the stack dependency-free while keeping the swap-out boundary explicit.

## Consequences

Positive: 8 backend integration/unit tests exercise the full HTTP surface through supertest without mocking Express itself, only the network-touching modules (`scrape.service`, `ssrfGuard`) are mocked. Swapping the in-memory `bookmarks.repository` for a real store touches exactly one file. Negative: state does not survive a process restart and there is no concurrency control, acceptable for a POC, called out explicitly as a follow-up.

## Alternatives Considered

1. A single flat file with all route handlers inline (rejected: unmaintainable past a handful of endpoints)
1. GraphQL (rejected: overkill for 4 CRUD-ish endpoints, adds a schema layer with no client benefit here)
1. A real database (Postgres/SQLite) from day one (rejected for the POC: adds migration/ops overhead; the repository module isolates the swap so it's a one-file change later)
