# rule-devops - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#61`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: devops, router, planned last in the area (`DEPENDENCIES.md`). Sibling
plans: `rule-devops-testing`, `rule-devops-observability`, `rule-devops-docker`,
`rule-devops-deploy-preview`. The shared router rules and the route-table
generator come from `rule-process`.

## Scope decisions (owner)

Inherited from the platform, meta and frontend interviews, 2026-10-21:

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Sibling plans | Assume the four leaves are executed; this plan describes the state after them |
| Route table | Waits for the census generator: this router is one of the eleven, and the Quick Selection drift below is the argument for it |
| Existing guardrails | **Keep**: this router owns `env-gitignore` and `secret-detection`, and the shared router rules join them rather than replace them |
| Tags | The router keeps `devops`, `index`; the five subject tags (`ci`, `cd`, `docker`, `preview`, `testing`, `observability`, `version`) move to the leaves |
| Rule set | Six shared router rules plus the two it already owns |
| Detection | Shared rule set, registered not copied |
| Fixtures | Shared corpus pairs plus router trees on disk |
| Flow | Failing test first |
| Gates | Router coverage, corpora, catalog clean, census, lint and typecheck, plus a routing prompt per leaf |
| Commits | One per phase |
| ADR | Two for the whole area: the devops family shape, the rule design |
| Done | Coverage is complete, the two secret rules still run, and the router rules pass |

## Evidence base (measured 2026-10-21)

`skills/rule-devops/SKILL.md` is **42 lines**: frontmatter with a `guardrails:`
key, a three-row table, a four-line Quick Selection, and three See-also links. It
is the smallest router in the catalog and one of only two that own rules.

### The table and the Quick Selection disagree

| Skill | Table row | Quick Selection line |
| ----- | --------- | -------------------- |
| `rule-devops-docker` | yes | yes |
| `rule-devops-observability` | yes | yes |
| `rule-devops-testing` | yes | yes |
| `rule-devops-deploy-preview` | **no** | **yes** |

So the router's short list advertises a skill its own table omits, and the gap
recorded in `ROUTER_GAPS` agrees with the table and not with the prose. Two
surfaces, one skill, opposite answers. This is the single most concrete argument
in the series for generating both from one source.

### The two rules it owns

`env-gitignore` and `secret-detection` are the only area-level rules in the
catalog besides `rule-backend`'s. They are the right rules to own at this level:
leaking a `.env` or a secret is a devops failure, not a framework one. The router
plan keeps them and adds the shared six beside them.

### Tags

Nine tags: `devops`, `ci`, `cd`, `docker`, `preview`, `testing`,
`observability`, `version`, `index`. Seven of them are the subjects of the four
leaves, so a prompt about Docker can match this router and the docker leaf
equally. The same pruning `rule-platform`, `rule-meta` and `rule-frontend` needed.

### Reach

| Door | State |
| ---- | ----- |
| `rule` dispatcher | listed |
| Inbound links | the four leaves, the toolchain skills, the backend leaves |

## The eight rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `env-gitignore` | A committed `.env` that git does not ignore | B | existing, keep |
| `secret-detection` | A literal secret in a tracked file | B | existing, keep |
| `router-dead-link` | A relative link resolving to no `SKILL.md` | B | clean |
| `router-tool-name` | A tool name the registry does not know | B | clean |
| `router-child-listed` | A skill under the area with no row | B | **red**: deploy-preview |
| `router-quick-selection` | A row the Quick Selection cannot reach, or a line with no row | B | **red**: deploy-preview, in the opposite direction |
| `router-no-stale-name` | A reference to a skill that no longer exists | B | clean |
| `router-tag-single-owner` | A subject tag claimed by the router and a leaf | B | **red**: seven tags |

## Phase 0 - Decisions

- [ ] ADR (area): the devops family shape. Testing owns the runner and coverage;
      observability owns SLOs and telemetry; docker owns the image contract;
      preview owns the pipeline; the router owns the two secret rules and the
      routing.
- [ ] ADR (area): the rule design, Tier B, dual detection, and the
      table-versus-Quick-Selection rule this router motivated.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/devops-router/`: `clean/`, `missing-child/`,
      `selection-without-row/`, `tag-overlap/`, each with a one-line
      `README.md`.
- [ ] Eight `CORPUS` pairs bound to `rule-devops`, two of them for the rules it
      already owns.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] Register the shared six beside `_env-gitignore.js` and
      `_secret-detection.js`.
- [ ] `guardrails:` frontmatter lists all eight ids, equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Close the drift

- [ ] The table gains the deploy-preview row and the gap entry is deleted.
- [ ] Table and Quick Selection are generated from one source once the census
      generator exists; until then, both are edited in the same commit and the
      rule keeps them equal.
- [ ] Tags reduced to `devops` and `index`.

## Phase 4 - Verification

- [ ] `_router-child-coverage`, `_corpus`, `_routing-corpus` suites.
- [ ] One routing prompt per leaf: container setup, preview pipeline, telemetry,
      test configuration each reach their leaf.
- [ ] A prompt about a leaked `.env` still reaches this router, not a leaf.
- [ ] Catalog scan with the eight rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests` | `deepseek-v4.1-flash` | test writing at the cheap end |
| Phase 2 - The rules | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Close the drift | `T7-author` | `qwen3.8-max` | skill bodies and references |
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

Depends on: `rule-devops-deploy-preview` (HARD), `rule-devops-docker` (HARD), `rule-devops-observability` (HARD), `rule-devops-testing` (HARD), `rule-process#2` (CONTRACT), `rule-process#3` (CONTRACT)

Feeds: —

Shared files: skills/rule/SKILL.md, scripts/data/router-gaps.data.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- The table and the Quick Selection contradicting each other is not a typo: it
  is what two hand-written surfaces do. The fix is one source, and until that
  source exists the rule is the only thing keeping them equal.
- The two secret rules are the reason this router is more than a list. They also
  make it the natural home for the redaction statement the observability leaf
  owns at the telemetry level: one rule at the edge, one in the pipeline.
- The area closes with this plan. After it, devops has four leaves a reader can
  reach and a router that lists all four, with `ROUTER_GAPS` empty for devops.
