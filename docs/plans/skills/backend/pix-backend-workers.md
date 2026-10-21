# rule-backend-workers - plan

Status: plan only, 2026-10-21. Index row `#71`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: backend, leaf and the server-side counterpart of `rule-frontend-workers`.
**424 lines**, one file, no `guardrails/`. It inherits the router's six rules
through `inherits: [rule-backend]`.

## Evidence base (measured 2026-10-21)

Shape: the core model (one JS thread, an event loop, libuv), the event loop's six
phases, microtasks are not a phase, the libuv thread pool and what does and does
not use it, then `worker_threads`, piscina, and cluster.

This is the deepest explanatory material in the catalog: it teaches the runtime
model instead of listing APIs, and the frontend leaf defers to it as "the
server-side counterpart" while this leaf defers back. The pair is coherent.

### It has no door

`rule-backend-workers` appears **zero times** in the `rule` dispatcher. The area
router lists it, the central table does not. It is the only backend leaf in that
position.

### What it states and nothing checks

| Statement | Enforced |
| --------- | -------- |
| CPU work in a request handler blocks every other request | **no** |
| The libuv pool defaults to four threads: crypto, DNS and fs share it | **no** |
| A worker thread pays off above a threshold, not below it | **no** |
| Transferred buffers are detached; do not read them after transfer | **no** |

The first is the rule that matters: the leaf spends 400 lines explaining why, and
a three-line check catches the pattern.

## The five rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `node-workers-no-cpu-in-handler` | Synchronous CPU work (hashing, compression, parsing) inside a request handler | B | n/a |
| `node-workers-pool-sized` | A `Worker` constructed per request, or a pool with no size limit | B | n/a |
| `node-workers-transfer-detached` | A buffer read after it was transferred | B | n/a |
| `node-workers-piscina-for-pooling` | A hand-rolled pool where the configured library is available | B | n/a |
| `node-workers-owner-named` | A section delegating browser workers or observability without naming the owner | B | partially red |

## Phases

### Phase 0 - Decisions

- [ ] ADR (area): the backend family shape; this leaf owns the runtime model and
      the worker contract, `rule-frontend-workers` owns the browser side.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/backend-workers/`: `clean/`, `cpu-in-handler/`,
      `worker-per-request/`, `read-after-transfer/`, each with a one-line
      `README.md`.
- [ ] Five `CORPUS` pairs bound to `rule-backend-workers`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-backend-workers/guardrails/`: five rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-backend]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Door and shape

- [ ] `rule` dispatcher row.
- [ ] Both worker leaves cross-link each other as counterparts (the frontend one
      already does; the reverse link exists too, and the plan keeps it).
- [ ] No trim: the explanatory depth is the value here, and 424 lines is the
      price of teaching an event loop.

## Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-backend-workers/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Open notes

- The runtime model is the one subject where a long body is justified, so this
  plan trims nothing. It adds rules and a door.
- `node-workers-no-cpu-in-handler` is the cheapest high-value rule in the backend
  area and the only one that needs no framework knowledge: `crypto.pbkdf2Sync`,
  `zlib.gzipSync` or `JSON.parse` of a large body inside a handler is the mistake
  the whole leaf exists to prevent.
