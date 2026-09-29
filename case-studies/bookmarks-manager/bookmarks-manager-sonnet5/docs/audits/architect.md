# architect audit

- **Role**: architect v2
- **Date**: 2026-09-27

Evidence only: the commands this run executed with their measured values, the files it read,
the sources it consulted. No opinions - those belong in the review.

## Evidence

| What was measured              | How                                                                                    | Result                                                                                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend unit tests            | `cd frontend && pnpm test`                                                             | Test Files 2 passed (2), Tests 7 passed (7)                                                                                                                        |
| Backend unit/integration tests | `cd backend && pnpm test`                                                              | Test Files 2 passed (2), Tests 8 passed (8)                                                                                                                        |
| Backend typecheck/build        | `cd backend && npx tsc -p tsconfig.json --noEmit`                                      | FAILS: src/modules/bookmarks/bookmarks.schema.ts(13,15) error TS2769: 'required_error' does not exist in type '$ZodStringParams'                                   |
| Frontend typecheck             | `cd frontend && npx tsc -p tsconfig.json --noEmit`                                     | exits 0 (FRONTEND-TS-OK)                                                                                                                                           |
| Lint gate, both packages       | `pnpm lint` from repo root                                                             | FAILS exit code 2; ESLint 10.11.0 reports all files ignored because `.eslintrc.json` is not a valid config under flat-config-only ESLint 10                        |
| Flat config presence           | `ls backend/eslint.config.* frontend/eslint.config.*`                                  | No such file or directory (both packages)                                                                                                                          |
| SSRF redirect handling         | read of backend/src/scraping/scrape.service.ts                                         | line 109 `redirect: "follow"`; redirect targets never re-validated by assertSafeUrl                                                                                |
| SSRF guard behavior            | read of backend/src/common/utils/ssrfGuard.ts                                          | validates scheme/hostname/DNS once, before fetch; blocks non-unicast ipaddr.js ranges                                                                              |
| List fetch pagination          | read of frontend/src/services/api.ts                                                   | fetchBookmarks hardcodes `/bookmarks?limit=100`, ignores x-total-count header returned by the backend                                                              |
| Contract type duplication      | read of backend/src/modules/bookmarks/bookmarks.types.ts and frontend/src/types/api.ts | Bookmark / error envelope declared twice, hand-synced                                                                                                              |
| Module structure               | `find backend frontend -type f -not -path '*/node_modules/*'`                          | backend: layered modules (router/controller/service/repository) + common middleware; frontend: component folders with index barrel, hooks, services, styles/tokens |
| Prior architecture decisions   | read of docs/adr/*.md                                                                  | ADR 003 pnpm workspace, ADR 004 server-side scraping with SSRF guard, ADR 006 layered Express with in-memory store (deliberate, not a finding)                     |
| Code size                      | `wc -l` over backend/src and frontend/src                                              | 989 lines total across measured TS/TSX/CSS source files                                                                                                            |
