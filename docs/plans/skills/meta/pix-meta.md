# rule-meta - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#46`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: meta, dispatcher, planned last in the area (`DEPENDENCIES.md`). Sibling
plans: `rule-meta-remix`, `rule-meta-nuxt`, `rule-meta-next`, `rule-meta-astro`.
The shared router rules and the route-table generator come from `rule-process`;
the same two were adopted by `rule-platform`.

## Scope decisions (owner)

Inherited from the platform interviews, 2026-10-21:

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Sibling plans | Assume the four leaves are executed; this plan describes the state after them |
| Route table | Waits for the census generator planned in `rule-process`; no hand-written table survives it |
| Reach | The dispatcher row for `rule-meta` is added here: the family is listed but its door is not |
| Rule set | The six router rules from `rule-process`, plus `router-no-unsupported-platform` |
| Tags | The dispatcher keeps `meta`, `meta-framework`, `dispatcher`; the framework subjects (`ssr`, `ssg`, `islands`, `routing`) belong to the leaves |
| Detection | Shared rule set, registered not copied |
| Fixtures | Shared corpus pairs plus router trees on disk |
| Flow | Failing test first |
| Gates | Router coverage, corpora, catalog clean, census, lint and typecheck, plus a routing prompt per leaf |
| Commits | One per phase |
| ADR | Two for the whole area: the meta family shape, the rule design |
| Done | Full coverage and green rules |

## Evidence base (measured 2026-10-21)

`skills/rule-meta/SKILL.md` is **80 lines**: frontmatter, an opening framing
paragraph, the four-row set table, a five-step dispatch contract, a "choosing
between them" section, an MCP tools table, and four See-also links.

| Fact | State |
| ---- | ----- |
| Children | 4, and the table lists all 4: no entry in `ROUTER_GAPS` |
| `rule` dispatcher row | **missing**: `rule-meta/SKILL.md` appears zero times, while its four children are listed |
| Dispatcher routing tree | line 46 already says "meta-framework → `rule-meta-*` + base framework skill", so the family is known and the door is not built |
| Tags | meta, meta-framework, dispatcher, ssr, ssg, islands, routing |
| Tag overlap | `ssr`, `ssg`, `islands`, `routing` are the leaves' subjects; the same problem `rule-platform` and `rule-method` had |
| Guardrails | none |
| See also | `rule`, `rule-frontend`, `rule-platform-web`, `rule-styleguide`: already correct |

This is the best-behaved router in the catalog: complete coverage, a real
dispatch contract, and a See-also block that names the right owners. Its
problem is the door above it and the tags it shares with its children.

### The dispatch contract is the part worth protecting

Five numbered steps: name the framework and stop; otherwise route on the
concept (islands, server actions, Nitro, loaders); add the base framework
skill; add `rule-styleguide` for anything that renders; add the deployment
skill. That is a routing policy expressed as prose, and nothing checks it. The
routing corpus in Phase 4 is the closest thing to a test.

## The seven rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `router-dead-link` | A relative link resolving to no `SKILL.md` | B | clean |
| `router-tool-name` | A tool name the registry does not know | B | clean: all five `rule_tool_meta*` names resolve |
| `router-child-listed` | A skill under the area with no row | B | clean |
| `router-quick-selection` | A row the dispatch contract cannot reach | B | clean |
| `router-no-stale-name` | A reference to a skill that no longer exists | B | clean |
| `router-tag-single-owner` | A subject tag claimed by the dispatcher and a leaf | B | **red**: four tags |
| `router-no-unsupported-platform` | A framework named in the table or tags with no skill serving it | B | clean: all four exist |

## Phase 0 - Decisions

- [ ] ADR (area): the meta family shape. Rendering, routing and data loading
      belong to the leaves; the component model to the framework skills; the
      choice between the four to this dispatcher.
- [ ] ADR (area): the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/meta-router/`: `clean/`, `missing-child/`,
      `unsupported-framework/`, `tag-overlap/`, each with a one-line
      `README.md`.
- [ ] Seven `CORPUS` pairs in `tests/fixtures/guardrail-corpus.mjs` bound to
      `rule-meta`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] Register the shared six plus `router-no-unsupported-platform`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Build the door

- [ ] `rule` dispatcher: a row for `rule-meta` in the table, and the routing
      tree line keeps pointing at the family.
- [ ] Tags reduced to `meta`, `meta-framework`, `dispatcher`; the four subject
      tags move to the leaves if they are not already there.
- [ ] Table regenerated by the census generator, four rows, no hand edit.

## Phase 4 - Verification

- [ ] `_router-child-coverage`, `_corpus`, `_routing-corpus` suites.
- [ ] One prompt per leaf: Astro islands, Next server components, Nuxt Nitro,
      Remix loaders each reach their leaf from a request that does not name it.
- [ ] A prompt that names no framework and asks about rendering reaches
      `rule-meta`.
- [ ] Catalog scan with the seven rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests` | `deepseek-v4.1-flash` | test writing at the cheap end |
| Phase 2 - The rules | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Build the door | `T5-bulk` | `minimax-m3.1-flash` | mechanical edits at scale |
| Phase 4 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

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

Depends on: `rule-meta-astro` (HARD), `rule-meta-next` (HARD), `rule-meta-nuxt` (HARD), `rule-meta-remix` (HARD), `rule-process#2` (CONTRACT), `rule-process#3` (CONTRACT)

Feeds: —

Shared files: skills/rule/SKILL.md, scripts/data/router-gaps.data.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- This plan waits on the generator (`rule-process` Phase 3) and the shared rule
  set (`rule-process` Phase 2). Both were also awaited by `rule-platform`, so the
  two router plans can be executed in one pass once the generator exists.
- The tag pruning is a routing change: `islands` is the word that finds Astro.
  The routing corpus in Phase 4 decides; if a leaf loses its own prompt, the tag
  returns to the leaf and never to the dispatcher.
- `router-no-unsupported-platform` is clean here and was red for
  `rule-platform`, which is the point of a shared rule: the same check catches
  different mistakes in different areas.
