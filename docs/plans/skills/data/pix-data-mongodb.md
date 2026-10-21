# rule-data-mongodb - plan

Status: plan only, 2026-10-21. Index row `#67`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: data, leaf. **735 lines**, one file, no auxiliary folders. Siblings:
`rule-data-sql`, `rule-data-postgresql`, `rule-data-mysql`, `rule-data-sqlite`,
`rule-data-duckdb`, `rule-data-indexed-db`, `rule-data-validation`, `rule-data`.

## Evidence base (measured 2026-10-21)

Title: "MongoDB 7+". Shape: table of contents, schema design patterns (embedding
vs referencing, a decision matrix, polymorphic schemas, time-series), CRUD
scripts, indexes, aggregation, transactions, replication, performance.

`inherits: [rule-data]`: the four area rules reach it, including
`transaction-safety` and `connection-pool`, which matter more here than the
relational leaves assume (MongoDB transactions are opt-in and pools are the
normal failure mode).

It is also the only NoSQL leaf, so the area rules written for SQL are applied to
a document store unchanged. That deserves one paragraph of thought in the ADR:
`parameterized-queries` protects against operator injection in a MongoDB filter
just as it does in SQL, and `migration-safety` means something different when the
schema lives in the application.

What it states and nothing checks:

| Statement | Enforced |
| --------- | -------- |
| Embed what is read together; reference what grows without bound | **no** |
| Arrays that grow without a limit are a design error | **no** |
| Every query pattern gets an index, in the order of the filter | **no** |
| Transactions cost; use them when a multi-document write must be atomic | **no** |

## The six rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `mongodb-no-unbounded-array` | An `$push` into a field with no cap, or a schema comment saying it grows forever | B | n/a |
| `mongodb-index-matches-query` | A query whose filter is not a prefix of an existing index | B | n/a |
| `mongodb-embed-vs-reference` | An embedded document read independently at scale, or a reference read always together | B | n/a |
| `mongodb-operator-injection` | A filter built by string concatenation or from raw user objects | B | n/a |
| `mongodb-owner-named` | A section delegating validation, pooling or generic migration rules without naming the owner | B | partially red |
| `mongodb-no-stale-skill-id` | A `rule-...` id with no skill directory | B | clean |

## Phases

### Phase 0 - Decisions

- [ ] ADR (area): the data family shape, plus the paragraph on how the four area
      rules translate to a document store.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/data-mongodb/`: `clean/`, `unbounded-array/`,
      `unindexed-query/`, `operator-injection/`, each with a one-line
      `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-data-mongodb`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-data-mongodb/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-data]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Trim

- [ ] Keep the schema design patterns and the decision matrix: they are the
      reason to read this leaf.
- [ ] Generic CRUD scripts and the aggregation tour become references.
- [ ] Target ~350 lines.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-data-mongodb/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-data-mongodb/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- `mongodb-operator-injection` is the same defence as `parameterized-queries`
  with a different syntax, and the area rule set does not cover it. That gap is
  worth naming in the ADR: the area's four rules are SQL-shaped.
- The schema decision matrix is the best artifact in the leaf. It is also the
  part a rule can only partially check, which is why the rules here are about
  consequences (unbounded arrays, index prefixes) rather than design choices.
