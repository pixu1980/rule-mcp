# rule-mcp-data-duckdb - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#69`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: data, leaf. **235 lines**, one file, no auxiliary folders. Siblings:
`rule-mcp-data-sql`, `rule-mcp-data-postgresql`, `rule-mcp-data-mysql`, `rule-mcp-data-mongodb`,
`rule-mcp-data-sqlite`, `rule-mcp-data-indexed-db`, `rule-mcp-data-validation`, `rule-mcp-data`.

## Evidence base (measured 2026-10-21)

Shape: installation and configuration, DuckDB-specific types, SQL extensions,
reading Parquet and CSV, analytics patterns, WASM in the browser, performance.

`inherits: [rule-mcp-data]` is declared. Two measured defects:

1. **No door:** zero rows in the `rule-mcp` dispatcher.
2. **A version claim in two places:** the router says "DuckDB 1+", the title
   says "DuckDB 1.x".

The area rules are relational-database rules applied to an analytical engine.
Three of the four fit (`connection-pool`, `parameterized-queries`,
`migration-safety`); `transaction-safety` fits less well, because the engine is
single-writer and the interesting failure is a long-running read starving a
write, not a lost transaction. Worth a sentence in the ADR rather than a silent
mismatch.

What it states and nothing checks:

| Statement                                                                 | Enforced |
| ------------------------------------------------------------------------- | -------- |
| DuckDB is analytical: do not treat it as an OLTP store                    | **no**   |
| Configuration pragmas belong in the connection setup, not in ad-hoc calls | **no**   |
| Read Parquet directly instead of importing into a table first             | **no**   |

## The four rules

| id                             | Rejects                                                                             | Tier | Today         |
| ------------------------------ | ----------------------------------------------------------------------------------- | ---- | ------------- |
| `duckdb-analytical-only`       | A point-write-per-request pattern, an auto-increment id, or a per-row `UPDATE` loop | B    | n/a           |
| `duckdb-pragma-at-connect`     | A setting applied ad-hoc instead of at connection setup                             | B    | n/a           |
| `duckdb-version-single-source` | The same version stated in the title and in the router                              | B    | **red**       |
| `duckdb-owner-named`           | A section delegating generic SQL or pooling without naming the owner                | B    | partially red |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD), `rule-mcp-data-sql` (ORDER)

Feeds: `rule-mcp-data` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR (area): the data family shape, including which of the four area rules
      do not translate to an analytical engine.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/data-duckdb/`: `clean/`, `oltp-pattern/`,
      `adhoc-pragma/`, `two-versions/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-mcp-data-duckdb`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-mcp-data-duckdb/guardrails/`: four rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-mcp-data]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Doors and shape

- [ ] `rule-mcp` dispatcher row.
- [ ] One version claim.
- [ ] Keep the Parquet/CSV section and the WASM section: they are the reason the
      leaf exists. Trim the generic SQL to a pointer.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-data-duckdb/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Doors and shape      | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-data-duckdb/guardrails/
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
- DuckDB in the browser (WASM) overlaps `rule-mcp-data-indexed-db` on the "data in
  the client" question. The boundary: IndexedDB is persistence, DuckDB-WASM is
  analysis over files. Say it in both leaves.
