# rule-data-sql - plan

Status: plan only, 2026-10-21. Index row `#64`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: data, leaf. It is the dialect-neutral member of the area and the largest
file in it (**821 lines**). Siblings: `rule-data-postgresql`, `rule-data-mysql`,
`rule-data-mongodb`, `rule-data-sqlite`, `rule-data-duckdb`,
`rule-data-indexed-db`, `rule-data-validation`, and `rule-data` (the router).

## Evidence base (measured 2026-10-21)

821 lines, one file, no `guardrails/`, no auxiliary folders. Shape: a table of
contents, then DDL scripts, table design patterns, indexing theory, transactions,
migrations, and query patterns.

The data area behaves differently from every area planned so far, and it is
better for it: the leaves declare `inherits: [rule-data]` and inherit the four
area rules (`connection-pool`, `migration-safety`, `parameterized-queries`,
`transaction-safety`). Verified by running the engine: a string-concatenated
query fails `parameterized-queries` when checked as `rule-data-sql`. This leaf
therefore adds **dialect-neutral rules only**; the safety set is already in
place above it.

Two measured defects:

1. **A version claim in two places.** The router table says SQLite 3.45+ and
   DuckDB 1+, while those skills' own titles say 3.x and 1.x. The version of a
   dependency stated twice drifts twice.
2. **Duplication with the four area rules.** `migration-safety`,
   `transaction-safety` and `parameterized-queries` state principles in code
   form; the body restates the same principles as prose in its migration and
   transaction sections. One owner per principle, and it is the rule.

## The six rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `sql-no-select-star` | `SELECT *` in application code, as opposed to an ad-hoc query | B | n/a |
| `sql-migration-reversible` | A migration with no down path or no locking consideration | B | n/a |
| `sql-index-foreign-key` | A foreign key with no index behind it | B | partly covered by `migration-safety` |
| `sql-version-single-source` | The same dependency version stated in the title and in the router | B | **red**: SQLite and DuckDB |
| `sql-owner-named` | A section delegating dialect specifics or the safety rules without naming the owner | B | partially red |
| `sql-no-stale-skill-id` | A `rule-...` id with no skill directory | B | clean |

## Phases

### Phase 0 - Decisions

- [ ] ADR (area): the data family shape. **Area rules live in `rule-data` and are
      inherited**; a leaf owns only what its engine does differently. This is
      the pattern the frontend leaves should have used instead of copying.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/data-sql/`: `clean/`, `select-star/`,
      `irreversible-migration/`, `unindexed-fk/`, `two-versions/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-data-sql`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-data-sql/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists the six; `inherits: [rule-data]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Trim

- [ ] The migration and transaction prose that restates an inherited rule
      becomes a pointer to the rule id.
- [ ] The version claims move to one place; the other references it.
- [ ] DDL templates that exist identically in four dialect leaves stay here
      only if they are dialect-neutral, and the dialect leaves link them.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-data-sql/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-data-sql/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- 821 lines with a table of contents is a book. The trim target is the SQL
  fundamentals plus pointers, and the dialect scripts move to the dialect leaves
  that own them.
- The inheritance here is the catalog's best structural example and it is worth
  naming in the area ADR: four rules, one owner, seven inheritors, zero copies.
- No dangling references were found in this area: unlike the frontend and meta
  leaves, the data skills do not cite `rule-styleguide -> *.md`. The area is
  cleaner than its siblings and the plan is correspondingly smaller.
