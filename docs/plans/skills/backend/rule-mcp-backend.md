# rule-mcp-backend - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#79`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: backend, router, planned last in the area (`DEPENDENCIES.md`). Siblings:
the eight leaves (`workers`, `security`, `node`, `nestjs`, `hono`, `graphql`,
`fastify`, `express`). The shared router rules and the route-table generator come
from `rule-mcp-process`.

## Why this router matters

Like `rule-mcp-data`, it owns the area's safety rules and the leaves inherit them:

```
cors-explicit, error-exposure, helmet-headers, input-validation,
rate-limiting, sql-injection
```

All eight leaves declare `inherits: [rule-mcp-backend]` and none of them carries a
copy. It is the largest area using the inheritance model (8 inheritors against
data's 7), and the rules are the HTTP surface every backend shares: headers,
CORS, rate limiting, input validation, error exposure and injection.

## Evidence base (measured 2026-10-21)

`skills/rule-mcp-backend/SKILL.md` is **139 lines**: frontmatter with a `guardrails:`
key, a backend-framework table, a database table with four **data-area** rows,
an API and architecture section, "Six ideas that replace memorizing
architectures", "Structuring a backend: the layouts, and when each stops paying",
a Quick Reference, and See also.

| Fact            | State                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Children        | 8: express, fastify, nestjs, hono, graphql, node, security, workers                                |
| Table rows      | 12: the 8 children plus **4 rows for `rule-mcp-data-*` skills**                                    |
| Quick Selection | none: this router uses a Quick Reference instead                                                   |
| Dispatcher rows | 8 of 9: **`rule-mcp-backend-workers` is missing**                                                  |
| Own rules       | 6, inherited by 8 leaves                                                                           |
| Tags            | backend, api, server, umbrella, index                                                              |
| Cross-area rows | 4 data rows, which also restate dependency versions                                                |
| Version claims  | "PostgreSQL 16+", "MySQL 8+ / MariaDB 11+" and "MongoDB 7+" appear here **and** in `rule-mcp-data` |

### The six ideas and the layouts are the content

`## Six ideas that replace memorizing architectures` and
`## Structuring a backend: the layouts, and when each stops paying` are 80 lines
of the 139 and are the reason this router is more than a list. Nothing else in
the catalog covers them, and no rule can check them. They stay.

### What the router actually lacks

1. **A dispatcher row for `rule-mcp-backend-workers`**, the last backend leaf without
   a door.
2. **One pointer instead of four data rows.** The data area lists those skills,
   and its own table is the maintained one. Here they are a third place where the
   version strings can drift.
3. **Tag hygiene**: `umbrella` is this router's own word, `api` and `server` are
   reasonable, and none of them collides with a leaf.

## The twelve rules

| id                           | Rejects                                                  | Tier | Today                        |
| ---------------------------- | -------------------------------------------------------- | ---- | ---------------------------- |
| `cors-explicit`              | A wildcard CORS origin with credentials                  | B    | existing, keep               |
| `error-exposure`             | A stack trace or internal message returned to the client | B    | existing, keep               |
| `helmet-headers`             | A server with no security headers                        | B    | existing, keep               |
| `input-validation`           | A handler using the raw body without a schema            | B    | existing, keep               |
| `rate-limiting`              | A public endpoint with no limiter                        | B    | existing, keep               |
| `sql-injection`              | A query built by concatenation                           | B    | existing, keep               |
| `router-dead-link`           | A relative link resolving to no `SKILL.md`               | B    | clean                        |
| `router-tool-name`           | A tool name the registry does not know                   | B    | clean                        |
| `router-child-listed`        | A skill under the area with no row                       | B    | clean                        |
| `router-quick-selection`     | A row no short list reaches                              | B    | n/a: no Quick Selection here |
| `router-no-stale-name`       | A reference to a skill that no longer exists             | B    | clean                        |
| `router-tag-single-owner`    | A subject tag claimed by the router and a leaf           | B    | clean                        |
| `backend-no-cross-area-rows` | A row for a skill another area owns                      | B    | **red**: 4 data rows         |

## Phases

## Dependency graph

The router closes after its leaves and after the shared router rules and the route-table generator are exported.

Depends on: `rule-mcp-backend-express` (HARD), `rule-mcp-backend-fastify` (HARD), `rule-mcp-backend-graphql` (HARD), `rule-mcp-backend-hono` (HARD), `rule-mcp-backend-nestjs` (HARD), `rule-mcp-backend-node` (HARD), `rule-mcp-backend-security` (HARD), `rule-mcp-backend-workers` (HARD), `rule-mcp-process#2` (CONTRACT), `rule-mcp-process#3` (CONTRACT)

Feeds:,

Shared files: skills/rule-mcp/SKILL.md, scripts/data/router-gaps.data.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR (area): the backend family shape, naming the inheritance pattern and
      the six HTTP rules as the area's safety floor.
- [ ] ADR (area): the rule design, Tier B, dual detection.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/backend-router/`: `clean/`, `cross-area-rows/`,
      `missing-child/`, `tag-overlap/`, each with a one-line `README.md`.
- [ ] Twelve `CORPUS` pairs bound to `rule-mcp-backend`, six of them for the rules it
      already owns.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] Register the shared six beside the six existing files.
- [ ] `guardrails:` frontmatter lists all twelve, equal to the exports.
- [ ] Green the Phase 1 suites.

### Phase 3 - Finish the area

- [ ] Dispatcher row for `rule-mcp-backend-workers`.
- [ ] The four data rows become one pointer to `rule-mcp-data`.
- [ ] The version strings leave this table; `rule-mcp-data` owns them.
- [ ] Table regenerated by the census generator once it exists.

### Phase 4 - Verification

- [ ] `_router-child-coverage`, `_corpus`, `_routing-corpus` suites.
- [ ] One routing prompt per leaf: eight requests that name no skill reach the
      eight leaves.
- [ ] An inheritance check: every backend leaf declares `inherits: [rule-mcp-backend]`.
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

## Open notes

- Twelve rules on one router sounds like a lot until four of them are why the
  area works and six are the HTTP safety floor every backend shares. The metric
  that matters is statements with nothing behind them, and after this plan the
  backend area has none.
- `router-quick-selection` cannot run here because this router has no Quick
  Selection. Registering a rule that cannot fire is worse than not registering
  it: the plan leaves it out and relies on `router-child-listed`.
- The six ideas and the layouts sections are the best prose in the backend area
  and the only part no rule can hold. Keeping them is what stops the router from
  becoming a table.
