# rule-data-mysql - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#66`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: data, leaf. **633 lines**, one file, no auxiliary folders. Siblings:
`rule-data-sql`, `rule-data-postgresql`, `rule-data-mongodb`, `rule-data-sqlite`,
`rule-data-duckdb`, `rule-data-indexed-db`, `rule-data-validation`, `rule-data`.

## Evidence base (measured 2026-10-21)

Title: "MySQL 8+ / MariaDB 11+". Shape: table of contents, DDL with InnoDB,
InnoDB tuning from a `my.cnf` for a 16 GB server, indexing, transactions,
migrations, replication, performance.

`inherits: [rule-data]` is declared, so the four area rules reach the leaf. It
adds MySQL-specific rules.

What it states and nothing checks:

| Statement | Enforced |
| --------- | -------- |
| InnoDB only; MyISAM is not an option | **no** |
| `utf8mb4` everywhere, never `utf8`/`utf8mb3` | **no** |
| Every FK gets an index (named section) | **no** |
| `my.cnf` values are a starting point, not a copy-paste answer | **no** |

The first two are one-line regexes and are the two most common MySQL mistakes in
generated schemas.

## The five rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `mysql-innodb-only` | `ENGINE=MyISAM` or a storage engine other than InnoDB | B | n/a |
| `mysql-utf8mb4` | `utf8`, `utf8mb3` or a charset-less `CREATE TABLE` | B | n/a |
| `mysql-index-foreign-key` | A `FOREIGN KEY` with no index in the same migration | B | n/a |
| `mysql-owner-named` | A section delegating generic SQL, pooling or migrations without naming the owner | B | partially red |
| `mysql-no-stale-skill-id` | A `rule-...` id with no skill directory | B | clean |

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

- [ ] `tests/fixtures/data-mysql/`: `clean/`, `myisam/`, `utf8-column/`,
      `unindexed-fk/`, each with a one-line `README.md`.
- [ ] Five `CORPUS` pairs bound to `rule-data-mysql`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-data-mysql/guardrails/`: five rule files plus `index.js`.
- [ ] `guardrails:` frontmatter lists them; `inherits: [rule-data]` stays.
- [ ] Green the Phase 1 suites.

### Phase 3 - Trim

- [ ] Generic DDL and transaction prose becomes a pointer to `rule-data-sql`.
- [ ] The `my.cnf` block stays, with one sentence saying which values depend on
      the server it runs on and which are policy.
- [ ] Target ~300 lines.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-data-mysql/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests` | `deepseek-v4.1-flash` | test writing at the cheap end |
| Phase 2 - The rules | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Trim | `T5-bulk` | `minimax-m3.1-flash` | mechanical edits at scale |
| Phase 4 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-data-mysql/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- `mysql-utf8mb4` is the cheapest high-value rule in the area: one pattern, one
  consequence (index length limits and silent data loss), no false positives.
- MariaDB is in the title and never in the rules. If the leaf claims both, one
  rule should say which differences matter; otherwise the title should drop
  MariaDB.
