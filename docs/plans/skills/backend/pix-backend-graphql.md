# rule-backend-graphql - plan

Status: plan only, 2026-10-21. Index row `#76`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: backend, leaf. **113 lines**, one file, no `guardrails/`. It inherits the
router's six rules through `inherits: [rule-backend]`.

## Evidence base (measured 2026-10-21)

The most disciplined leaf in the area: five numbered principles, each with the
reason attached, then a checklist.

1. Design the schema before resolvers.
2. Keep resolvers thin and authorize at the boundary.
3. Prevent N+1 queries and unbounded work.
4. Cache intentionally.
5. Verify the contract and operational behavior.
6. Checklist, then See also.

Nothing is duplicated from a sibling and there are no invented rule ids. What it
lacks is enforcement: five principles, zero checks, and the router's six rules do
not cover any of them - they are HTTP-shaped (CORS, helmet, rate limiting, input
validation).

## The four rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `graphql-no-n-plus-one` | A resolver that queries per parent item with no batching | B | n/a |
| `graphql-authz-at-boundary` | Authorization inside field logic rather than at the entry point | B | n/a |
| `graphql-query-complexity-limit` | A schema served with no depth or complexity cap | B | n/a |
| `graphql-owner-named` | A section delegating auth, validation or pooling without naming the owner | B | partially red |

## Phases

### Phase 0 - Decisions

- [ ] ADR (area): the backend family shape; this leaf owns the query contract,
      the router keeps the shared HTTP hardening.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/backend-graphql/`: `clean/`, `n-plus-one/`,
      `authz-in-field/`, `no-complexity-cap/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-backend-graphql`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-backend-graphql/guardrails/`: four rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-backend]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Shape

- [ ] The checklist gains the rule ids, so a reader can run what it names.
- [ ] No trim: 113 lines is the target size for a leaf.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-backend-graphql/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Open notes

- The principles here are the strongest in the area and the least enforced,
  because the inherited six are HTTP-shaped and GraphQL failures are not.
  `graphql-no-n-plus-one` is what pays for the plan.
- Authorization appears twice in the catalog after this: at the boundary here and
  per route in `rule-backend-security`. The ADR should say the boundary is the
  contract and the route is the implementation.
