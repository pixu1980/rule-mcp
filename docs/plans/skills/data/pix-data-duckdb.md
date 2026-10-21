# rule-data-duckdb - plan

Status: plan only, 2026-10-21. Index row `#69`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: data, leaf. **235 lines**, one file, no auxiliary folders. Siblings:
`rule-data-sql`, `rule-data-postgresql`, `rule-data-mysql`, `rule-data-mongodb`,
`rule-data-sqlite`, `rule-data-indexed-db`, `rule-data-validation`, `rule-data`.

## Evidence base (measured 2026-10-21)

Shape: installation and configuration, DuckDB-specific types, SQL extensions,
reading Parquet and CSV, analytics patterns, WASM in the browser, performance.

`inherits: [rule-data]` is declared. Two measured defects:

1. **No door:** zero rows in the `rule` dispatcher.
2. **A version claim in two places:** the router says "DuckDB 1+", the title
   says "DuckDB 1.x".

The area rules are relational-database rules applied to an analytical engine.
Three of the four fit (`connection-pool`, `parameterized-queries`,
`migration-safety`); `transaction-safety` fits less well, because the engine is
single-writer and the interesting failure is a long-running read starving a
write, not a lost transaction. Worth a sentence in the ADR rather than a silent
mismatch.

What it states and nothing checks:

| Statement | Enforced |
| --------- | -------- |
| DuckDB is analytical: do not treat it as an OLTP store | **no** |
| Configuration pragmas belong in the connection setup, not in ad-hoc calls | **no** |
| Read Parquet directly instead of importing into a table first | **no** |

## The four rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `duckdb-analytical-only` | A point-write-per-request pattern, an auto-increment id, or a per-row `UPDATE` loop | B | n/a |
| `duckdb-pragma-at-connect` | A setting applied ad-hoc instead of at connection setup | B | n/a |
| `duckdb-version-single-source` | The same version stated in the title and in the router | B | **red** |
| `duckdb-owner-named` | A section delegating generic SQL or pooling without naming the owner | B | partially red |

## Phases

### Phase 0 - Decisions

- [ ] ADR (area): the data family shape, including which of the four area rules
      do not translate to an analytical engine.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/data-duckdb/`: `clean/`, `oltp-pattern/`,
      `adhoc-pragma/`, `two-versions/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-data-duckdb`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-data-duckdb/guardrails/`: four rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-data]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Doors and shape

- [ ] `rule` dispatcher row.
- [ ] One version claim.
- [ ] Keep the Parquet/CSV section and the WASM section: they are the reason the
      leaf exists. Trim the generic SQL to a pointer.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-data-duckdb/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-data-duckdb/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- Four rules rather than six because an analytical engine has fewer correctness
  traps in the documented surface: the interesting ones are architectural
  (don't use it for OLTP), and an architectural rule is hard to check. The plan
  keeps the two that a pattern can catch instead of padding the set.
- DuckDB in the browser (WASM) overlaps `rule-data-indexed-db` on the "data in
  the client" question. The boundary: IndexedDB is persistence, DuckDB-WASM is
  analysis over files. Say it in both leaves.
