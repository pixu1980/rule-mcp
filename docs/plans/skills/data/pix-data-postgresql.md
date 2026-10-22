# rule-data-postgresql - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#65`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: data, leaf. **736 lines**, one file, no auxiliary folders. Siblings:
`rule-data-sql` (dialect-neutral rules), `rule-data-mysql`, `rule-data-mongodb`,
`rule-data-sqlite`, `rule-data-duckdb`, `rule-data-indexed-db`,
`rule-data-validation`, and `rule-data`.

## Evidence base (measured 2026-10-21)

Shape: table of contents, DDL with every PostgreSQL feature, indexing strategy,
JSONB, partitioning, replication, transactions, migrations, performance.

`inherits: [rule-data]` is declared, so the four area rules
(`connection-pool`, `migration-safety`, `parameterized-queries`,
`transaction-safety`) reach this leaf - verified by running the engine on a
concatenated query. The leaf adds only PostgreSQL-specific rules.

What it states and nothing checks:

| Statement in the body | Enforced |
| --------------------- | -------- |
| "Foreign-key indexing rule" - every FK gets an index | **no** |
| JSONB is for shape-shifting data, not for relational modelling | **no** |
| Timestamp and identifier choices (identity over serial) | **no** |
| Partitioning needs a key chosen before the first row | **no** |

The first is the one worth encoding: an unindexed foreign key is the most common
performance mistake in a PostgreSQL schema, it is stated in bold in this leaf,
and `migration-safety` does not look for it.

## The six rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `postgresql-index-foreign-key` | A `REFERENCES` column with no index in the same migration | B | n/a |
| `postgresql-no-serial` | `serial` / `bigserial` where `identity` is available | B | n/a |
| `postgresql-jsonb-not-relational` | A JSONB column replacing a table with more than one row per record | B | n/a |
| `postgresql-partition-key-first` | A `PARTITION BY` added after the table has data | B | n/a |
| `postgresql-owner-named` | A section delegating generic SQL, migrations or pooling without naming the owner | B | partially red |
| `postgresql-no-stale-skill-id` | A `rule-...` id with no skill directory | B | clean |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD), `rule-data-sql` (ORDER)

Feeds: `rule-data` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR (area): the data family shape; area rules in the router, dialect rules
      in the leaf.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/data-postgresql/`: `clean/`, `unindexed-fk/`,
      `serial-ids/`, `jsonb-as-tables/`, each with a one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-data-postgresql`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-data-postgresql/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-data]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Trim

- [ ] Generic DDL and transaction prose becomes a pointer to `rule-data-sql` and
      to the inherited rule ids.
- [ ] Keep: indexing strategy, JSONB discipline, partitioning, replication.
- [ ] Target ~350 lines.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-data-postgresql/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests` | `deepseek-v4.1-flash` | test writing at the cheap end |
| Phase 2 - The rules | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Trim | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 4 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-data-postgresql/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- The unreachable-statement pattern is the same as everywhere in this series: a
  rule the author believed in, written in bold, with no mechanism behind it. Two
  lines of regex catch the FK one.
- This leaf, MySQL and SQLite repeat the same DDL skeleton. The dialect
  differences are the value; the skeleton belongs in `rule-data-sql`.
- No dangling references and no invented rule ids were found here. The data area
  needs rules, not repairs.
