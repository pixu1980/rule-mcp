# rule-backend-express - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#78`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: backend, leaf. **153 lines**, one file, no `guardrails/`. It inherits the
router's six rules through `inherits: [rule-backend]`.

## Evidence base (measured 2026-10-21)

Sections: application structure, middleware pipeline, error handling, performance
tuning, request validation, graceful shutdown, file tree convention _from
rule-backend_, layered architecture.

### The section that says where it comes from

`## Express File Tree Convention (from rule-backend)` is the best-labeled section
in the catalog: it names its own source in the title. That is the pattern the
other leaves should copy instead of restating the layout.

### What it states and nothing checks

| Statement                                            | Enforced                              |
| ---------------------------------------------------- | ------------------------------------- |
| Async handler errors must reach the error middleware | **no**                                |
| The four-argument error handler is registered last   | **no**                                |
| Shutdown drains connections before the process exits | **no**                                |
| Layered architecture: routes, services, repositories | duplicate of the router's own section |

Express 5 forwards rejected promises; Express 4 does not, and a handler that
throws asynchronously silently never reaches the error middleware. That is the
most common Express bug, it is stated in the body, and no rule checks it.

## The five rules

| id                               | Rejects                                                                     | Tier | Today         |
| -------------------------------- | --------------------------------------------------------------------------- | ---- | ------------- |
| `express-async-errors-forwarded` | An async handler with no wrapper, on Express 4                              | B    | n/a           |
| `express-error-middleware-last`  | An error handler registered before routes, or with three arguments          | B    | n/a           |
| `express-graceful-shutdown`      | No SIGTERM handler, or one that exits before the server closes              | B    | n/a           |
| `express-no-sync-fs-in-handler`  | `readFileSync` and friends inside a request path                            | B    | n/a           |
| `express-owner-named`            | A section delegating validation, pooling or layout without naming the owner | B    | partially red |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-backend` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR (area): the backend family shape; the Express leaf owns the middleware
      contract, the router owns the HTTP hardening.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/backend-express/`: `clean/`, `unwrapped-async/`,
      `error-handler-first/`, `sync-fs/`, each with a one-line `README.md`.
- [ ] Five `CORPUS` pairs bound to `rule-backend-express`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-backend-express/guardrails/`: five rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-backend]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Shape

- [ ] The layered-architecture section becomes a pointer at the router's
      structuring section, keeping only what Express changes.
- [ ] The Express 4 versus 5 difference is stated once, next to the rule id.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-backend-express/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Shape                | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- `express-async-errors-forwarded` pays for the plan on its own: it is the
  difference between an error that reaches the handler and an unhandled
  rejection that takes the process down in Express 4.
- The "(from rule-backend)" label in a heading saves a reader a search. It should
  be house style, not an accident.
