# rule-mcp-frontend - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#56`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: frontend, router, planned last in the area (`DEPENDENCIES.md`). Sibling
plans: the seven leaves (`workers`, `vue`, `svelte`, `solidjs`, `react`,
`angular`, `template-engine`) and `rule-mcp-meta` (the dispatcher for the four
meta-framework rows this router also carries). The shared router rules and the
route-table generator come from `rule-mcp-process`.

## Scope decisions (owner)

Inherited from the platform and meta interviews, 2026-10-21:

| Question           | Decision                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Scope of this pass | **Plan only**                                                                                                    |
| Sibling plans      | Assume the seven leaves are executed; this plan describes the state after them                                   |
| Route table        | Waits for the census generator planned in `rule-mcp-process`; this router is one of the eleven                   |
| Cross-area rows    | A frontend router may **point** at the meta-framework dispatcher; it may not carry the four meta rows as its own |
| Tags               | The router keeps `frontend`, `ui`, `index`; the six framework subjects move to the leaves that own them          |
| Rule set           | The six router rules from `rule-mcp-process`, plus one this router needs: no cross-area rows                     |
| Detection          | Shared rule set, registered not copied                                                                           |
| Fixtures           | Shared corpus pairs plus router trees on disk                                                                    |
| Flow               | Failing test first                                                                                               |
| Gates              | Router coverage, corpora, catalog clean, census, lint and typecheck, plus a routing prompt per leaf              |
| Commits            | One per phase                                                                                                    |
| ADR                | Two: the frontend family shape (shared with the leaves), the rule design                                         |
| Done               | Coverage is complete and the rule set passes                                                                     |

## Evidence base (measured 2026-10-21)

`skills/rule-mcp-frontend/SKILL.md` is **116 lines**: frontmatter, a UI-framework
table, a cross-framework rules section, a cross-cutting table, a
meta-framework table, an "over-engineering" section, a Quick Selection of
eleven lines, and three See-also links.

| Fact                   | State                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Children after ADR 152 | 7: angular, react, solidjs, svelte, template-engine, vue, workers                                                        |
| Table rows             | 10: the six UI frameworks, workers, and the four meta-frameworks                                                         |
| Missing child          | **`rule-mcp-frontend-template-engine`**, the last entry in `ROUTER_GAPS`                                                 |
| Dispatcher row         | present                                                                                                                  |
| Tags                   | frontend, ui, react, vue, angular, svelte, solidjs, astro, index                                                         |
| Tag overlap            | each of `react`, `vue`, `angular`, `svelte`, `solidjs`, `astro` is claimed by exactly 2 skills: this router and its leaf |
| Guardrails             | none                                                                                                                     |

### Four rows that belong to another area

The router's tables carry `rule-mcp-meta-astro`, `rule-mcp-meta-next`, `rule-mcp-meta-nuxt` and
`rule-mcp-meta-remix` - four skills `rule-mcp-meta` owns and lists. Two dispatchers, the
same four rows, and only one of them regenerates. The Quick Selection repeats
them again (three lines).

That is why the rule below exists. The point is not that a reader should not
find Astro from here; it is that the row is maintained twice and drifts twice.

### The section worth keeping

"Rules that hold whichever framework you route to" states the zero-classes and
flex-first principles once, with the `/* grid: why */` marker and the
`css-flex-first` rule id, and points at `rule-mcp-styleguide-css` for the
conversions. That is the right place for a cross-framework rule: one statement,
one owner, one link. It also demonstrates what the leaves should have done
instead of copying six lines each.

### Reach

| Door                  | State                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `rule-mcp` dispatcher | listed                                                                                   |
| Inbound links         | the largest hub in the area: every frontend leaf, the ui skills, `rule-mcp-platform-web` |

## The seven rules

| id                            | Rejects                                        | Tier | Today                                                           |
| ----------------------------- | ---------------------------------------------- | ---- | --------------------------------------------------------------- |
| `router-dead-link`            | A relative link resolving to no `SKILL.md`     | B    | clean                                                           |
| `router-tool-name`            | A tool name the registry does not know         | B    | clean                                                           |
| `router-child-listed`         | A skill under the area with no row             | B    | **red**: `rule-mcp-frontend-template-engine`                    |
| `router-quick-selection`      | A row the Quick Selection cannot reach         | B    | **red**: template-engine, and the meta rows are reachable twice |
| `router-no-stale-name`        | A reference to a skill that no longer exists   | B    | clean after ADR 152                                             |
| `router-tag-single-owner`     | A subject tag claimed by the router and a leaf | B    | **red**: six tags                                               |
| `frontend-no-cross-area-rows` | A row for a skill another area owns            | B    | **red**: four meta rows                                         |

## Phase 0 - Decisions

- [ ] ADR: the frontend family shape. Frameworks, cross-cutting concerns and
      the template engine belong here; the meta-frameworks belong to
      `rule-mcp-meta`, which this router links.
- [ ] ADR: the rule design, Tier B, dual detection, including the cross-area
      rule this router motivated.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/frontend-router/`: `clean/`, `missing-child/`,
      `cross-area-rows/`, `tag-overlap/`, each with a one-line `README.md`.
- [ ] Seven `CORPUS` pairs in `tests/fixtures/guardrail-corpus.mjs` bound to
      `rule-mcp-frontend`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] Register the shared six plus `frontend-no-cross-area-rows`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Open the last door

- [ ] A row for `rule-mcp-frontend-template-engine` and a Quick Selection line.
- [ ] Delete the `"rule-mcp-frontend"` entry from
      `scripts/data/router-gaps.data.mjs`: the area has no gaps after this.
- [ ] Replace the four meta rows with one pointer line to `rule-mcp-meta`, and the
      three meta Quick Selection lines with one.
- [ ] Tags reduced to `frontend`, `ui`, `index`.
- [ ] Table regenerated by the census generator once it exists.

## Phase 4 - Verification

- [ ] `_router-child-coverage`, `_corpus`, `_routing-corpus` suites.
- [ ] One routing prompt per leaf: a request that names no skill reaches each
      of the seven.
- [ ] A prompt about rendering with no framework named reaches `rule-mcp-meta`, not
      this router.
- [ ] Catalog scan with the seven rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Open the last door   | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
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

## Dependency graph

The router closes after its leaves and after the shared router rules and the route-table generator are exported.

Depends on: `rule-mcp-frontend-angular` (HARD), `rule-mcp-frontend-react` (HARD), `rule-mcp-frontend-solidjs` (HARD), `rule-mcp-frontend-svelte` (HARD), `rule-mcp-frontend-template-engine` (HARD), `rule-mcp-frontend-vue` (HARD), `rule-mcp-frontend-workers` (HARD), `rule-mcp-process#2` (CONTRACT), `rule-mcp-process#3` (CONTRACT)

Feeds:,

Shared files: skills/rule-mcp/SKILL.md, scripts/data/router-gaps.data.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- This router is in better shape than the platform one was: coverage is one row
  short, and the rest is tag hygiene and a boundary. It is also the only router
  that states a cross-framework rule with a rule id behind it, which is the
  pattern the leaves should have copied and did not.
- The meta rows are defensible as documentation and indefensible as
  maintenance. One pointer line to `rule-mcp-meta` keeps the reader's path and drops
  the second place to edit. If the owner prefers keeping the rows, the rule
  becomes advisory-by-hand instead of a check, and the drift returns.
- The area closes with this plan: after it, frontend has seven leaves and a
  router that lists all seven, and `ROUTER_GAPS` is empty for the area for the
  first time.
