# rule-mcp-data-indexed-db - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#68`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: data, leaf. **323 lines**, one file, no auxiliary folders. Siblings:
`rule-mcp-data-sql`, `rule-mcp-data-postgresql`, `rule-mcp-data-mysql`, `rule-mcp-data-mongodb`,
`rule-mcp-data-sqlite`, `rule-mcp-data-duckdb`, `rule-mcp-data-validation`, `rule-mcp-data`.

## Evidence base (measured 2026-10-21)

Title: "IndexedDB / File System". Shape: database setup and schema, object
stores and indexes, CRUD, transactions, versioning, quota, worker usage,
File System Access API.

`inherits: [rule-mcp-data]` is declared. Two measured defects, both structural:

1. **No door:** zero rows in the `rule-mcp` dispatcher.
2. **The title claims two technologies.** "IndexedDB / File System" - the File
   System Access API is a different API with a different permission model, and
   the body documents both. One skill, two subjects, and the routing name only
   says one of them.

What it states and nothing checks:

| Statement                                                                     | Enforced |
| ----------------------------------------------------------------------------- | -------- |
| Schema changes go through `onupgradeneeded`, never an ad-hoc `deleteDatabase` | **no**   |
| Compound indexes exist for the queries you actually run                       | **no**   |
| A transaction is scoped and short: no `await` on a network call inside it     | **no**   |
| Quota is finite: handle `QuotaExceededError`                                  | **no**   |

The third is the classic IndexedDB bug: an awaited non-IDB promise inside a
transaction lets the transaction auto-commit, and the next request throws.

## The six rules

| id                            | Rejects                                                                          | Tier | Today         |
| ----------------------------- | -------------------------------------------------------------------------------- | ---- | ------------- |
| `idb-versioned-schema`        | A store or index created outside `onupgradeneeded`                               | B    | n/a           |
| `idb-no-await-in-transaction` | An awaited non-IDB call inside an open transaction                               | B    | n/a           |
| `idb-quota-handled`           | A write path with no `QuotaExceededError` branch                                 | B    | n/a           |
| `idb-compound-index`          | A multi-key query with no compound index behind it                               | B    | n/a           |
| `idb-owner-named`             | A section delegating persistence policy or worker usage without naming the owner | B    | partially red |
| `idb-no-stale-skill-id`       | A `rule-mcp-...` id with no skill directory                                      | B    | clean         |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD), `rule-mcp-data-sql` (ORDER)

Feeds: `rule-mcp-data` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR (area): the data family shape, including whether the File System
      Access material stays in this leaf or becomes its own skill. The plan
      keeps it here and says why: one leaf, two APIs, one client-side storage
      question.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/data-indexed-db/`: `clean/`, `adhoc-store/`,
      `await-in-transaction/`, `no-quota-branch/`, each with a one-line
      `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-mcp-data-indexed-db`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-mcp-data-indexed-db/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-mcp-data]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Doors and title

- [ ] `rule-mcp` dispatcher row.
- [ ] The title says what the skill covers; the router row agrees with it.
- [ ] The worker section points at `rule-mcp-frontend-workers` instead of restating
      it.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-data-indexed-db/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Doors and title      | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-data-indexed-db/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- `idb-no-await-in-transaction` is the most valuable rule in the data area
  written against a non-SQL case: it is a one-pattern check for a bug that
  produces a confusing `TransactionInactiveError` hours into a feature.
- The File System Access API title is a scope question for the ADR, not a
  defect: the material is coherent (client storage), the name is not.
