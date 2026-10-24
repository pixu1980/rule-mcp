# rule-data - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#70`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: data, router, planned last in the area (`DEPENDENCIES.md`). Siblings: the
eight leaves. `rule-data-validation` keeps the plan it already has (`#62`), which
predates this series and is left alone.

## Why this router matters more than the others

Every other area planned so far keeps its rules in the leaves. This one keeps
four rules **in the router** and its seven database leaves declare
`inherits: [rule-data]`, so the rules reach them without a copy anywhere:

```
connection-pool, migration-safety, parameterized-queries, transaction-safety
```

Verified by running the engine: a string-concatenated query checked as
`rule-data-postgresql` fails `parameterized-queries`. That is the pattern the
`rule-process-bmad` plan proposed for its family, and the data area already ships
it. The router plan's job is to protect it, not to re-architect it.

## Evidence base (measured 2026-10-21)

`skills/rule-data/SKILL.md` is **85 lines**: frontmatter with a `guardrails:`
key, an eight-row table, a long data-architecture section (lake, warehouse,
lakehouse, medallion, lambda, kappa, mesh, fabric, vault), a seven-line Quick
Selection, and two See-also links.

| Fact                  | State                                                                      |
| --------------------- | -------------------------------------------------------------------------- |
| Children              | 8: sql, postgresql, mysql, mongodb, sqlite, duckdb, indexed-db, validation |
| Table rows            | 8: complete, no `ROUTER_GAPS` entry for this area                          |
| Quick Selection lines | 7: **`rule-data-validation` is unreachable there**                         |
| Dispatcher rows       | 5 of 8: **sqlite, duckdb and indexed-db are missing**                      |
| Own rules             | 4, inherited by 7 leaves                                                   |
| Tags                  | data, database, index, sql, nosql                                          |
| Tag overlap           | `sql` is claimed by 5 skills, `nosql` by 2 including this router           |
| Dangling references   | none                                                                       |
| Invented rule ids     | none                                                                       |

### The architecture section is the best content in the area

Nine patterns, grouped by the four questions they answer (where data lands, how
fresh it must be, who owns it, how much history must be provable), each with the
trade-off in one clause, and a closing line that picks one per situation. Nothing
in the catalog duplicates it and no rule can check it. It stays.

### What the router actually lacks

1. **A Quick Selection line for validation**, the one child a reader cannot
   reach from the short list.
2. **Dispatcher rows for three leaves.** They are the router's children and the
   central table does not list them, which this plan fixes because nobody else
   will.
3. **Tag hygiene**: `sql` and `nosql` belong to the leaves that teach them.

## The ten rules

| id                        | Rejects                                                | Tier | Today                                         |
| ------------------------- | ------------------------------------------------------ | ---- | --------------------------------------------- |
| `connection-pool`         | A new connection per request                           | B    | existing, keep                                |
| `migration-safety`        | A migration that locks a hot table or cannot roll back | B    | existing, keep                                |
| `parameterized-queries`   | A query built by string concatenation                  | B    | existing, keep                                |
| `transaction-safety`      | A multi-statement write with no transaction boundary   | B    | existing, keep                                |
| `router-dead-link`        | A relative link resolving to no `SKILL.md`             | B    | clean                                         |
| `router-tool-name`        | A tool name the registry does not know                 | B    | clean                                         |
| `router-child-listed`     | A skill under the area with no row                     | B    | clean: the best-covered router in the catalog |
| `router-quick-selection`  | A row the Quick Selection cannot reach                 | B    | **red**: validation                           |
| `router-no-stale-name`    | A reference to a skill that no longer exists           | B    | clean                                         |
| `router-tag-single-owner` | A subject tag claimed by the router and a leaf         | B    | **red**: `sql`, `nosql`                       |

## Phases

## Dependency graph

The router closes after its leaves and after the shared router rules and the route-table generator are exported.

Depends on: `rule-data-duckdb` (HARD), `rule-data-indexed-db` (HARD), `rule-data-mongodb` (HARD), `rule-data-mysql` (HARD), `rule-data-postgresql` (HARD), `rule-data-sql` (HARD), `rule-data-sqlite` (HARD), `rule-data-validation` (HARD), `rule-process#2` (CONTRACT), `rule-process#3` (CONTRACT)

Feeds:,

Shared files: skills/rule/SKILL.md, scripts/data/router-gaps.data.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR (area): the data family shape, naming the inheritance pattern as the
      area's decision and the reference model for the other areas.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/data-router/`: `clean/`, `selection-without-row/`,
      `tag-overlap/`, `uninherited-leaf/`, each with a one-line `README.md`.
- [ ] Ten `CORPUS` pairs bound to `rule-data`, four of them for the rules it
      already owns.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] Register the shared six beside the four existing files.
- [ ] `guardrails:` frontmatter lists all ten, equal to the exports.
- [ ] Green the Phase 1 suites.

### Phase 3 - Finish the area

- [ ] Quick Selection gains `rule-data-validation`.
- [ ] Dispatcher rows for sqlite, duckdb and indexed-db.
- [ ] Tags reduced to `data`, `database`, `index`.
- [ ] Table regenerated by the census generator once it exists.

### Phase 4 - Verification

- [ ] `_router-child-coverage`, `_corpus`, `_routing-corpus` suites.
- [ ] One routing prompt per leaf: eight requests that name no skill reach the
      eight leaves.
- [ ] An inheritance check: every database leaf declares `inherits: [rule-data]`,
      and a new leaf without it fails.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Finish the area      | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_router-child-coverage.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- The `uninherited-leaf` fixture is the rule this area needs most: six areas were
  planned before this one, and not one of them used inheritance. A leaf that
  forgets `inherits` silently loses the safety rules, which is worse than owning
  none, because the catalog believes it is protected.
- Ten rules on a router looks like a lot until four of them are the reason the
  area works. The catalog's rule count is not the metric; the number of
  statements with nothing behind them is.
- The data area is the one area in this series where the plan is mostly
  protection and doors rather than repair: no dangling references, no invented
  ids, complete table. It is the model the others should copy.
