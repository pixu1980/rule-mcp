# rule-ai - plan

Status: plan only, 2026-10-21. Index row `#84`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: ai, router, planned last in the area and last in the catalogue.
Siblings: `rule-ai-prompting`, `rule-ai-evals`, `rule-ai-context-engineering`,
`rule-ai-agent-architecture`. The shared router rules come from `rule-process`.

## The one area with no floor at all

ADR 137 (proposed, 2026-10-17) records it exactly: five rule-ai skills exist, none
owns a guardrail, none declares `inherits`. Every other area has either rules of
its own (`rule-process-ai`, `rule-styleguide-*`), inherited area rules
(`rule-data`, `rule-backend`) or both. The AI area has neither, which means the one
area that describes agent code - the most expensive code to get wrong - is the
only one nothing checks.

ADR 137 already specifies the fix, so this plan implements it instead of
inventing a second family:

| Tier | Rules |
| ---- | ----- |
| A | `ai-tool-schema`, `ai-call-timeout`, `ai-max-tokens`, `ai-output-validated`, `ai-no-secrets-in-prompt`, `ai-trace-span` |
| B | `ai-eval-presence`, `ai-mcp-token-validation` |

All eight ship advisory first and are promoted after the corpus gate reports full
precision and recall - ADR 137's own rule, kept as written.

## Evidence base (measured 2026-10-21)

`skills/rule-ai/SKILL.md` is **67 lines**: frontmatter with a `compatibility:` key
and no `guardrails:`, a four-row table, an "AI features to build that are not
another chatbot" section, and See also.

| Fact | State |
| ---- | ----- |
| Children | 4: prompting, evals, context-engineering, agent-architecture |
| Table rows | 4: complete |
| Quick Selection | 4 lines, one per child |
| Dispatcher rows | **1 of 5**: the router is listed, all four children are not |
| Own rules | **none** |
| `inherits:` in the area | **none** |
| Dangling or invented ids | none |

### The description names a package that does not exist

`rule-ai` says it covers "agent scaffolding on `@rule/rule-mcp-core`". The same
string appears in the `rule` dispatcher row, and in
`src/core/detector/_rules.data.js` as the marker that a project is an agents
project:

```js
{ deps: ["@rule/rule-mcp-core"], key: "agents" },
```

The package this repository ships is **`rule-mcp`**, no `@rule` scope is
installed anywhere, and the string is a leftover from the pre-rename project. Two
consequences, both measurable:

1. A project that depends on `rule-mcp` is **not detected** as an agents
   project, so `agents → rule-ai` never fires for the one project that obviously
   should.
2. The router and the dispatcher describe the area in terms of a dependency a
   reader cannot install.

### The four children are unreachable from the centre

`rule-ai` lists them; the `rule` dispatcher does not. That is the same gap
`rule-frontend-workers`, `rule-backend-workers` and three data leaves have, and it
is the reason the AI area plans carry dispatcher rows in their own phases too.

## The fourteen rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `ai-tool-schema` | A tool declared without a schema the model can be held to | A | n/a |
| `ai-call-timeout` | A model call with no timeout | A | n/a |
| `ai-max-tokens` | A generation with no output cap | A | n/a |
| `ai-output-validated` | Model output used without validation against its schema | A | n/a |
| `ai-no-secrets-in-prompt` | A credential or key interpolated into a prompt | A | n/a |
| `ai-trace-span` | A generation with no span emitted | A | n/a |
| `ai-eval-presence` | An AI feature with no eval | B | n/a |
| `ai-mcp-token-validation` | An MCP server accepting a token it does not validate | B | n/a |
| `router-dead-link` | A relative link resolving to no `SKILL.md` | B | clean |
| `router-tool-name` | A tool name the registry does not know | B | clean |
| `router-child-listed` | A skill under the area with no row | B | clean |
| `router-quick-selection` | A row the Quick Selection cannot reach | B | clean |
| `router-no-stale-name` | A reference to a skill that no longer exists | B | clean |
| `router-no-stale-package` | A dependency named in a description or a detector rule that the catalogue does not ship | B | **red**: `@rule/rule-mcp-core` |

### Reaching the children

ADR 137 left one question open: whether the four children declare
`inherits: [rule-ai]`. This plan answers **yes**, on the evidence of the two areas
that already do it: `rule-data` (4 rules, 7 inheritors) and `rule-backend` (6
rules, 8 inheritors). Without it the AI floor protects the router and nothing
that the router routes to - the worst of both worlds, because the catalogue
believes it is covered.

## Phases

### Phase 0 - Decisions

- [ ] ADR: the AI family shape. Accepts ADR 137's eight rules as written,
      answers its open question with inheritance, and supersedes its proposed
      status.
- [ ] ADR: the rule design, tiers as ADR 137 set them, detection shared with the
      other areas.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/ai-router/`: `clean/`, `tool-without-schema/`,
      `unbounded-generation/`, `unvalidated-output/`, `secret-in-prompt/`,
      `stale-package/`, each with a one-line `README.md`.
- [ ] Fourteen `CORPUS` pairs bound to `rule-ai`, eight of them for ADR 137's
      rules.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-ai/guardrails/`: eight `ai-*` files plus six router files.
- [ ] `guardrails:` frontmatter lists all fourteen.
- [ ] Every `ai-*` rule cites OWASP, MCP or OpenTelemetry in its description, as
      ADR 137 requires.
- [ ] Green the Phase 1 suites.

### Phase 3 - Fix the package name

- [ ] `@rule/rule-mcp-core` leaves the router description, the dispatcher row and
      `src/core/detector/_rules.data.js`.
- [ ] The detector marker becomes a package that exists, and the detector test
      covers the agents key like it covers react, vue and electron.
- [ ] `router-no-stale-package` keeps the string from returning.

### Phase 4 - Finish the catalogue

- [ ] Dispatcher rows for the four children, if the AI leaf plans have not landed
      them.
- [ ] The four children declare `inherits: [rule-ai]`.
- [ ] Table regenerated by the census generator once it exists.

### Phase 5 - Verification

- [ ] `_router-child-coverage`, `_corpus`, `_routing-corpus` suites.
- [ ] One routing prompt per child: prompting, evals, context, agent
      architecture each reach their leaf from a request that names no skill.
- [ ] Detector test: a project depending on this server is detected as `agents`.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Open notes

- ADR 137 has been proposed since 2026-10-17. This plan is the first thing in the
  series that turns a proposed ADR into a plan instead of writing a new one, and
  that is the right order: the decision exists, the execution did not.
- `ai-trace-span` overlaps `observability-behavior-versions`, and ADR 137 itself
  flags it. The owner split: the span is emitted here, the versions it carries are
  defined there.
- The stale package name is the finding with the longest reach in this plan: it
  is one string in three files, and it silently disables the detector rule for the
  project the catalogue is built for.
- With this plan the catalogue has a plan for every skill, and the last area to
  finish is the only one whose floor is written but not built.
