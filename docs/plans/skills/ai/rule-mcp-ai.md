# rule-ai - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#84`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: ai, router, planned last in the area and last in the catalog.
Siblings: `rule-ai-prompting`, `rule-ai-evals`, `rule-ai-context-engineering`,
`rule-ai-agent-architecture`. The shared router rules come from `rule-process`.

## The one area with no floor at all

ADR 137 (proposed, 2026-10-17) records it exactly: five rule-ai skills exist, none
owns a guardrail, none declares `inherits`. Every other area has either rules of
its own, inherited area rules (`rule-data`, `rule-backend`) or both. The AI area has
neither, which means the one area that describes agent code - the most expensive
code to get wrong - is the only one nothing checks.

**Where the eight rules land, decided on 2026-10-21 (ADR 153, P10):** in
`rule-ai-agent-architecture`, the leaf that consumes them, not here. This router
keeps only the six shared router rules. That is the same model `rule-data` and
`rule-backend` use, moved one level down because AI has exactly one leaf that
describes the code ADR 137's rules check.

| Tier | Rules                                                                                                                   | Owner                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| A    | `ai-tool-schema`, `ai-call-timeout`, `ai-max-tokens`, `ai-output-validated`, `ai-no-secrets-in-prompt`, `ai-trace-span` | `rule-ai-agent-architecture` |
| B    | `ai-eval-presence`, `ai-mcp-token-validation`                                                                           | `rule-ai-agent-architecture` |

## Evidence base (measured 2026-10-21)

`skills/rule-ai/SKILL.md` is **67 lines**: frontmatter with a `compatibility:` key
and no `guardrails:`, a four-row table, an "AI features to build that are not
another chatbot" section, and See also.

| Fact                     | State                                                        |
| ------------------------ | ------------------------------------------------------------ |
| Children                 | 4: prompting, evals, context-engineering, agent-architecture |
| Table rows               | 4: complete                                                  |
| Quick Selection          | 4 lines, one per child                                       |
| Dispatcher rows          | **1 of 5**: the router is listed, all four children are not  |
| Own rules                | **none**                                                     |
| `inherits:` in the area  | **none**                                                     |
| Dangling or invented ids | none                                                         |

### The description names a package that does not exist

`rule-ai` says it covers "agent scaffolding on `@rule-mcp/rule-mcp-core`". The same
string appears in the `rule-mcp` dispatcher row, and in
`src/core/detector/_rules.data.js` as the marker that a project is an agents
project:

```js
{ deps: ["@rule-mcp/rule-mcp-core"], key: "agents" },
```

The package this repository ships is **`rule-mcp`**, no `@rule-mcp` scope is
installed anywhere, and the string is a leftover from the pre-rename project. Two
consequences, both measurable:

1. A project that depends on `rule-mcp` is **not detected** as an agents
   project, so `agents → rule-ai` never fires for the one project that obviously
   should.
2. The router and the dispatcher describe the area in terms of a dependency a
   reader cannot install.

### The four children are unreachable from the center

`rule-ai` lists them; the `rule-mcp` dispatcher does not. That is the same gap
`rule-frontend-workers`, `rule-backend-workers` and three data leaves have, and it
is the reason the AI area plans carry dispatcher rows in their own phases too.

## The seven rules

Six shared router rules, plus the one this router motivated:

| id                          | Rejects                                                                               | Tier | Today                              |
| --------------------------- | ------------------------------------------------------------------------------------- | ---- | ---------------------------------- |
| `router-dead-link`          | A relative link resolving to no `SKILL.md`                                            | B    | clean                              |
| `router-tool-name`          | A tool name the registry does not know                                                | B    | clean                              |
| `router-child-listed`       | A skill under the area with no row                                                    | B    | clean                              |
| `router-quick-selection`    | A row the Quick Selection cannot reach                                                | B    | clean                              |
| `router-no-stale-name`      | A reference to a skill that no longer exists                                          | B    | clean                              |
| `router-no-stale-package`   | A dependency named in a description or a detector rule that the catalog does not ship | B    | **red**: `@rule-mcp/rule-mcp-core` |
| `router-ai-floor-reachable` | A child of the AI area with no pointer to the rules it must follow                    | B    | **red**: four children, no link    |

## Reaching the children

ADR 137 left one question open: whether the four children declare
`inherits: [rule-ai]`. This plan answers **no**, and P10 explains why: the eight
rules live in `rule-ai-agent-architecture`, so there is nothing in the router to
inherit. The children instead link the leaf that owns the floor, and
`router-ai-floor-reachable` keeps that link alive.

## Phases

## Dependency graph

The router closes after its leaves and after the shared router rules and the route-table generator are exported.

Depends on: `rule-ai-agent-architecture` (HARD), `rule-ai-context-engineering` (HARD), `rule-ai-evals` (HARD), `rule-ai-prompting` (HARD), `rule-process#2` (CONTRACT), `rule-process#3` (CONTRACT)

Feeds:,

Shared files: skills/rule/SKILL.md, scripts/data/router-gaps.data.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR: the AI family shape. Amends ADR 137's placement: the eight rules
      live in `rule-ai-agent-architecture`, the router stays a list (P10), and 137
      moves from proposed to superseded.
- [ ] ADR: the rule design, tiers as ADR 137 set them, detection shared with the
      other areas.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/ai-router/`: `clean/`, `stale-package/`,
      `unlinked-floor/`, `selection-without-row/`, each with a one-line
      `README.md`.
- [ ] Seven `CORPUS` pairs bound to `rule-ai`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-ai/guardrails/`: six router rule files plus
      `_router-ai-floor-reachable.js`.
- [ ] `guardrails:` frontmatter lists all seven.
- [ ] Green the Phase 1 suites.

### Phase 3 - Fix the package name

- [ ] `@rule-mcp/rule-mcp-core` leaves the router description, the dispatcher row and
      `src/core/detector/_rules.data.js`.
- [ ] The detector marker becomes a package that exists, and the detector test
      covers the agents key like it covers react, vue and electron.
- [ ] `router-no-stale-package` keeps the string from returning.

### Phase 4 - Finish the catalog

- [ ] Dispatcher rows for the four children, if the AI leaf plans have not landed
      them.
- [ ] The four children link `rule-ai-agent-architecture` as the owner of the
      shared floor; none of them declares `inherits: [rule-ai]`, because the
      router owns no rule the leaves need (P10).
- [ ] Table regenerated by the census generator once it exists.

### Phase 5 - Verification

- [ ] `_router-child-coverage`, `_corpus`, `_routing-corpus` suites.
- [ ] One routing prompt per child: prompting, evals, context, agent
      architecture each reach their leaf from a request that names no skill.
- [ ] Detector test: a project depending on this server is detected as `agents`.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Fix the package name | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Finish the catalog   | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 5 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- ADR 137 has been proposed since 2026-10-17. This plan is the first thing in the
  series that turns a proposed ADR into a plan instead of writing a new one, and
  that is the right order: the decision exists, the execution did not.
- ADR 137 put the eight rules in this router; the decision of 2026-10-21 moved
  them to `rule-ai-agent-architecture` (P10, ADR 153). The router keeps the
  routing and one rule of its own, which is the same shape `rule-data` and
  `rule-backend` have, one level down.
- `ai-trace-span` overlaps `observability-behavior-versions`, and ADR 137 itself
  flags it. The owner split: the span is emitted here, the versions it carries are
  defined there.
- The stale package name is the finding with the longest reach in this plan: it
  is one string in three files, and it silently disables the detector rule for the
  project the catalog is built for.
- With this plan the catalog has a plan for every skill, and the last area to
  finish is the only one whose floor is written but not built.
