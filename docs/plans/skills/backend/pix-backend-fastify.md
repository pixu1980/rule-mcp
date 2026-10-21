# rule-backend-fastify - plan

Status: plan only, 2026-10-21. Index row `#77`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: backend, leaf. **81 lines**, the smallest skill in the area, one file, no
`guardrails/`. It inherits the router's six rules through `inherits: [rule-backend]`.

## Evidence base (measured 2026-10-21)

Sections: fastify architecture, schema validation and serialization, hooks
lifecycle, performance tuning, "NestJS Testing", See also.

### A section that names the wrong framework

The heading at line 71 says **"## NestJS Testing"**. Its three bullets are pure
Fastify:

```
- app.inject() for integration tests (no HTTP server needed)
- @fastify/swagger for contract testing
- Mock plugins in unit tests via fastify-plugin wrapping
```

A copy-paste heading from the NestJS leaf, never corrected. It is the smallest
and clearest defect in this series: the body is right, the label is wrong, and a
reader scanning the section list concludes that the Fastify skill documents
NestJS.

### What it states and nothing checks

| Statement | Enforced |
| --------- | -------- |
| Every route declares a schema, for validation and for serialization speed | **no** |
| Encapsulation comes from plugins, not from middleware ordering | **no** |
| `app.inject()` is how integration tests avoid a listening server | **no** |

## The four rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `fastify-schema-every-route` | A route registration with no `schema` block | B | n/a |
| `fastify-plugin-encapsulation` | Shared state or decorators added outside `fastify-plugin` | B | n/a |
| `fastify-heading-names-framework` | A heading naming another framework (this leaf's own defect) | B | **red** |
| `fastify-owner-named` | A section delegating pooling, validation or logging without naming the owner | B | partially red |

## Phases

### Phase 0 - Decisions

- [ ] ADR (area): the backend family shape; area rules in the router, framework
      rules in the leaf.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/backend-fastify/`: `clean/`, `schema-less-route/`,
      `unwrapped-plugin/`, `wrong-heading/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-backend-fastify`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-backend-fastify/guardrails/`: four rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-backend]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Fix the heading

- [ ] "NestJS Testing" becomes "Fastify Testing".
- [ ] The benchmark claim ("2-3x faster than Express") cites a benchmark or
      loses the number.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-backend-fastify/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Open notes

- 81 lines with six inherited rules behind it is the best size/coverage ratio in
  the backend area. The plan fixes a heading, adds three rules, and is done.
- `fastify-heading-names-framework` generalises to any leaf that copies a section
  from a sibling: the heading carries the wrong name and the body does not. A
  catalog-wide check would have found this years earlier.
