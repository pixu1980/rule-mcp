# rule-data-sqlite - plan

Status: plan only, 2026-10-21. Index row `#63`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: data, leaf. **243 lines**, one file, no auxiliary folders. Siblings:
`rule-data-sql`, `rule-data-postgresql`, `rule-data-mysql`, `rule-data-mongodb`,
`rule-data-duckdb`, `rule-data-indexed-db`, `rule-data-validation`, `rule-data`.

## Evidence base (measured 2026-10-21)

Shape: table of contents, DDL with constraints, migration-safe schema changes,
journal modes and transaction control, indexing, FTS, JSON, performance.

`inherits: [rule-data]` is declared. Two measured defects:

1. **No door:** `rule-data-sqlite` appears **zero times** in the `rule`
   dispatcher. The area router lists it, the central table does not.
2. **A version claim in two places:** the router table says "SQLite 3.45+" and
   the skill title says "SQLite 3.x".

What it states and nothing checks:

| Statement | Enforced |
| --------- | -------- |
| WAL is the default journal mode, and the comparison table says why | **no** |
| `PRAGMA foreign_keys = ON` per connection: SQLite does not do it for you | **no** |
| Set `busy_timeout`, or a concurrent write becomes an error | **no** |
| Migration-safe schema changes use the rebuild pattern, not `ALTER` guesses | **partly** by `migration-safety` |

The second is the classic SQLite trap: foreign keys are declared, respected by
the planner, and **off at runtime** unless the pragma runs on every connection.

## The five rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `sqlite-foreign-keys-on` | A connection opened with no `PRAGMA foreign_keys = ON` | B | n/a |
| `sqlite-busy-timeout` | A connection with no busy timeout or a zero one | B | n/a |
| `sqlite-wal-mode` | A write-heavy setup left on the default rollback journal | B | n/a |
| `sqlite-version-single-source` | The same version stated in the title and in the router | B | **red** |
| `sqlite-owner-named` | A section delegating generic SQL, pooling or migrations without naming the owner | B | partially red |

## Phases

### Phase 0 - Decisions

- [ ] ADR (area): the data family shape; area rules in the router, dialect rules
      in the leaf.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/data-sqlite/`: `clean/`, `foreign-keys-off/`,
      `no-busy-timeout/`, `rollback-journal/`, each with a one-line `README.md`.
- [ ] Five `CORPUS` pairs bound to `rule-data-sqlite`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-data-sqlite/guardrails/`: five rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-data]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Doors and versions

- [ ] `rule` dispatcher row.
- [ ] One version claim; the other reference points at it.
- [ ] Trim the generic SQL prose to a pointer at `rule-data-sql`.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-data-sqlite/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-data-sqlite/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- 243 lines is the healthiest size in the data area, and the three pragma rules
  are the highest-value rules in it: each one is a runtime behaviour the schema
  cannot express.
- Three leaves in this area are missing from the dispatcher (sqlite, duckdb,
  indexed-db). The router plan carries the rows; this plan just notes that the
  door is missing, which is why the rule set is not the only output here.
