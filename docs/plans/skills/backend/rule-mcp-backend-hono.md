# rule-mcp-backend-hono - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#75`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: backend, leaf. **89 lines**, one file, no `guardrails/`. It inherits the
router's six rules through `inherits: [rule-mcp-backend]`.

## Evidence base (measured 2026-10-21)

Sections: Hono architecture, request validation, performance characteristics,
multi-runtime deployment, RPC client, testing.

The property that matters: Hono runs **everywhere** (Node, Bun, Deno, Cloudflare
Workers), and the router's six rules assume a Node server with helmet and CORS
middleware. Two of them (`helmet-headers`, `cors-explicit`) have a different
shape on an edge runtime, and `rate-limiting` usually has to run somewhere other
than the handler. That translation deserves a paragraph in the ADR instead of a
silent mismatch.

What it states and nothing checks:

| Statement                                                     | Enforced |
| ------------------------------------------------------------- | -------- |
| Bindings are typed per runtime, not read as `any`             | **no**   |
| Middleware order matters: auth before body parsing            | **no**   |
| The RPC client is the contract; no hand-written fetch wrapper | **no**   |

## The four rules

| id                         | Rejects                                                                         | Tier | Today         |
| -------------------------- | ------------------------------------------------------------------------------- | ---- | ------------- |
| `hono-bindings-typed`      | `c.env` read as `any`, or a binding declared without a type                     | B    | n/a           |
| `hono-middleware-order`    | Auth or validation registered after the handler that needs it                   | B    | n/a           |
| `hono-runtime-portability` | A Node-only API in a leaf that claims multi-runtime support                     | B    | n/a           |
| `hono-owner-named`         | A section delegating rate limiting, headers or pooling without naming the owner | B    | partially red |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD)

Feeds: `rule-mcp-backend` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR (area): the backend family shape, including how the router's HTTP
      hardening rules translate to an edge runtime.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/backend-hono/`: `clean/`, `untyped-bindings/`,
      `wrong-middleware-order/`, `node-only-api/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-mcp-backend-hono`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-mcp-backend-hono/guardrails/`: four rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-mcp-backend]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Shape

- [ ] The multi-runtime section says which of the six inherited rules it changes
      and how, so the reader does not have to infer it.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-backend-hono/guardrails/`
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

- 89 lines, six sections, no duplication: the leaf is in good shape. The only
  real design work is the Node-assumption in the inherited rules.
- `hono-runtime-portability` keeps the multi-runtime claim honest and is the rule
  a reviewer benefits from most.
