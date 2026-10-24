# rule-mcp-platform - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#41`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: platform, router, planned last in the area (`DEPENDENCIES.md`). Sibling
plans: `rule-mcp-platform-auth`, `rule-mcp-platform-library`, `rule-mcp-platform-web`,
`rule-mcp-platform-desktop`; the generator this plan waits for comes from
`rule-mcp-process`; the shared rule set too.

## Scope decisions (owner, 2026-10-21)

| Question           | Decision                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass | **Plan only**                                                                                                                    |
| Sibling plans      | Assume `auth`, `library` and `desktop` are executed; this plan describes the state after them and owns no rename of its own      |
| Route table        | Waits for the census generator planned in `rule-mcp-process`; no hand-written table survives the generator                       |
| Mobile             | Remove the promise **and** open the plan for `rule-mcp-platform-mobile` in this pass                                             |
| Rule set           | The six router rules from `rule-mcp-process`, plus one this router needs: no platform is promised without a skill that serves it |
| Tags               | Only the area's own subject: `platform` and `index`. The detail tags live in the leaves                                          |
| Detection          | Shared rule set; a rule that needs a child's rule set refers to it rather than copying it                                        |
| Fixtures           | Shared corpus pairs plus router trees on disk                                                                                    |
| Flow               | Failing test first                                                                                                               |
| Gates              | Router coverage, corpora, catalog clean, census, lint and typecheck, and a routing prompt per leaf                               |
| Commits            | One per phase                                                                                                                    |
| ADR                | Two: the area closure, the rule design                                                                                           |
| Done               | Full coverage and green rules                                                                                                    |

## Evidence base (measured 2026-10-21)

`skills/rule-mcp-platform/SKILL.md` is **39 lines**: frontmatter, a three-row table,
a three-line Quick Selection, and three See-also links. It is the smallest
router in the repository.

| Fact                  | State                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Children              | 4: `rule-mcp-platform-auth`, `rule-mcp-platform-desktop`, `rule-mcp-platform-library`, `rule-mcp-platform-web` |
| Rows in the table     | 3: auth is missing, recorded in `ROUTER_GAPS`                                                                  |
| Quick Selection lines | 3: auth unreachable, and publishing routes to `library`                                                        |
| Description           | "Covers desktop, mobile (Expo), library authoring, and web conventions"                                        |
| Tags                  | platform, desktop, electron, mobile, expo, library, web, index                                                 |
| Detector              | `FRAMEWORK_SKILL_MAP` has no mobile or expo entry                                                              |
| Guardrails            | none                                                                                                           |

### The mobile promise, measured honestly

The earlier count of "Expo appears in 12 skills" was wrong: most hits are the
word _Export_. The real mentions are **two**, both in testing skills, both
saying the same thing:

- `rule-mcp-devops-testing`: "One exception: Expo and React Native. That stack uses
  `jest`"
- `rule-mcp-process-tdd`: "Exception - Expo/React Native projects: use `jest` +
  `jest-expo` + `@testing-library/react-native`"

So the catalog carries a testing exception for a platform it never covers, and
this router promises that platform with a tag and a description. The detector
has no entry either. The gap is real but its demand signal is two exceptions
plus a promise, not twelve skills.

### Tag overlap with the leaves

`desktop`, `electron`, `library`, `web` are the leaves' own subjects and this
router claims all four. `rule-mcp-platform-desktop` already carries `desktop` and
`electron`, `rule-mcp-platform-library` carries `library`, `rule-mcp-platform-web`
carries `web`. `rule-mcp-method`'s plan recorded the same problem for `methodology`.
The owner's call here: the router keeps `platform` and `index` and nothing else.

## The seven rules

| id                               | Rejects                                                              | Tier | Today                                                |
| -------------------------------- | -------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| `router-dead-link`               | A relative link resolving to no `SKILL.md`                           | B    | clean                                                |
| `router-tool-name`               | A tool name the registry does not know                               | B    | clean here                                           |
| `router-child-listed`            | A skill under the area with no row                                   | B    | red: `rule-mcp-platform-auth`                        |
| `router-quick-selection`         | A row the Quick Selection cannot reach                               | B    | red: auth, and publishing points at the wrong leaf   |
| `router-no-stale-name`           | A reference to a skill that no longer exists                         | B    | clean after the `rule-mcp-platform-agent` retirement |
| `router-tag-single-owner`        | A detail tag claimed by the router and its leaf                      | B    | red: four tags                                       |
| `router-no-unsupported-platform` | A platform named in the description or tags with no skill serving it | B    | red: mobile, Expo                                    |

The first six come from `rule-mcp-process` and are shared, not copied: this router
registers the same rule objects. The seventh is new and belongs to any router
that advertises a platform.

## Phase 0 - Decisions

- [ ] ADR: the platform area closes. What it owns (desktop, library, web,
      auth), what it delegates, and why mobile is absent until its skill lands.
- [ ] ADR: the rule design for a router that advertises platforms.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/platform-router/`: `clean/`, `missing-child/`,
      `unsupported-platform/`, `tag-overlap/`, each with a one-line
      `README.md`.
- [ ] Seven `CORPUS` pairs in `tests/fixtures/guardrail-corpus.mjs` bound to
      `rule-mcp-platform` (the six shared rules already have pairs; add the missing
      ones and the platform rule).
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] Register the shared six plus `router-no-unsupported-platform`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Open the mobile plan

- [ ] `docs/plans/skills/platform/rule-mcp-platform-mobile.md`: Expo and React
      Native as the supported stack, the `jest` exception that already exists in
      two skills, `@testing-library/react-native`, Capacitor watched and not
      covered, and the shared web rules that still apply.
- [ ] Index row appended as `#42`, with the note that new rows append and the
      numbers stay stable (the same rule that retired `#40`).
- [ ] `FRAMEWORK_SKILL_MAP` gains `expo` and `react-native` when the skill
      exists, in the mobile plan, not here.

## Phase 4 - Finish the door

- [ ] The table carries four rows, or five once mobile exists, and the
      generator writes it.
- [ ] Quick Selection: publishing routes to `rule-mcp-process-npm-release`; auth
      gains its line; every row is reachable.
- [ ] Description: no mobile claim until the skill exists; auth named.
- [ ] Tags: `platform`, `index` only.
- [ ] Delete `"rule-mcp-platform": ["rule-mcp-platform-auth"]` from
      `scripts/data/router-gaps.data.mjs`.

## Phase 5 - Verification

- [ ] `_router-child-coverage`, `_corpus`, `_routing-corpus` suites.
- [ ] One routing prompt per leaf: auth, desktop, library, web each reach their
      own skill from a request that does not name the skill.
- [ ] Catalog scan with the seven rules: only the documented cases remain.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Open the mobile plan | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 4 - Finish the door      | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 5 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T1-plan` - `gemini-4-argon` (high). Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

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

Depends on: `rule-mcp-platform-auth` (HARD), `rule-mcp-platform-desktop` (HARD), `rule-mcp-platform-library` (HARD), `rule-mcp-platform-mobile` (HARD), `rule-mcp-platform-web` (HARD), `rule-mcp-process#2` (CONTRACT), `rule-mcp-process#3` (CONTRACT)

Feeds:,

Shared files: skills/rule/SKILL.md, scripts/data/router-gaps.data.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- This plan waits on two things owned elsewhere: the route-table generator
  (`rule-mcp-process` Phase 3) and the shared rule set (`rule-mcp-process` Phase 2). It
  can be executed by hand before either lands, and the cost is doing the same
  work twice. The plan prefers waiting.
- Pruning the four detail tags is a routing change, not cosmetic: `electron`
  and `library` are words a prompt may carry. The routing corpus in Phase 5 is
  the check; if a leaf stops winning its own prompt, the tag returns to the
  leaf, never to the router.
- `router-no-unsupported-platform` is the rule that would have caught the Expo
  promise years earlier, and the same rule would have caught the agent row if
  the agent skill had never existed. It is the most transferable rule in this
  series.
- The area closes with this plan. After it, platform has five leaves (four
  planned, mobile planned here) and a router that lists them.
