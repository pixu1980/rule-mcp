# rule-devops-observability - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#58`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: devops, leaf. Sibling plans: `rule-devops-testing`, `rule-devops-docker`,
`rule-devops-deploy-preview` (same series) and `rule-devops` (the router).

## Scope decisions (owner)

Inherited from the platform, meta and frontend interviews, 2026-10-21:

| Question           | Decision                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass | **Plan only**                                                                                                                         |
| Identity           | Keep the skill as it is: this is the leaf that already documents its own contradictions, and it is the only one in the area that does |
| Rule set           | **Create**: the leaf owns no guardrail. The rules encode the three statements it makes most strongly                                  |
| Agent tracing      | The agent section stays here; it is the reason the skill is cited from the AI area                                                    |
| Rule set size      | Six rules, all Tier B (advisory)                                                                                                      |
| Detection          | Both: section and table parsing, plus injected `fileList`                                                                             |
| Fixtures           | Shared corpus pairs plus skill trees on disk                                                                                          |
| Flow               | Failing test first                                                                                                                    |
| Gates              | Skill suite, corpora, catalog clean, census, lint and typecheck                                                                       |
| Commits            | One per phase                                                                                                                         |
| ADR                | Two for the whole area: the devops family shape, the rule design                                                                      |
| Done               | The three strongest statements are enforceable and the rules pass                                                                     |

## Evidence base (measured 2026-10-21)

`skills/rule-devops-observability/SKILL.md` is **214 lines**, one file only: no
`guardrails/`, no `references/`, no auxiliary folders.

Sections: service objectives, correlated telemetry (logs, metrics, traces),
deployments observable and reversible, alerting and incident learning, tracing
an agent (spans, cost per session, replay), the contradiction section, versioning
what shapes behavior.

### The one skill that argues with itself on purpose

`### Where this contradicts section 2, and why` is the best thing in the file: it
states that section 2 says "sample deliberately", then says "for agents, do not:
**keep every trace**", explains why (volumes are lower, each trace is
irreplaceable), and adds the constraint that survives the exception ("redaction
does not relax with it"). A contradiction that is owned and explained is worth
more than a consistent document that hides the trade-off, and this is the only
skill in the catalog doing it.

It also has no rule behind any of it. The three strongest statements -

1. redact at the point of emission, on day one;
2. every trace carries the version of each thing that shapes behavior;
3. keep every failure trace, sample successes when volume forces a choice -

are exactly the kind of statement a rule can hold.

### Overlap to keep an eye on

The agent tracing section (spans, cost per session, replay, behavior versioning)
overlaps `rule-ai-agent-architecture` and `rule-ai-evals`. The boundary that holds:
this leaf owns the telemetry contract, the AI leaves own the harness and the
evaluation. The plan states it; the rule `observability-owner-named` is what
keeps it stated.

## The six rules

| id                                    | Rejects                                                                                 | Reads                       | Tier | Today               |
| ------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------- | ---- | ------------------- |
| `observability-redaction-at-emission` | Logging or tracing code that sends a payload without masking at the emission point      | `code`                      | B    | n/a: no rules exist |
| `observability-behavior-versions`     | A trace record carrying no prompt, model, tool-schema or index version                  | `code`                      | B    | n/a                 |
| `observability-no-pii-logged`         | `console.log` or a structured log call with a whole request or user object              | `code`                      | B    | n/a                 |
| `observability-slo-defined`           | An alert rule with no service objective behind it                                       | `code`                      | B    | n/a                 |
| `observability-owner-named`           | A section that delegates telemetry, evaluation or harness work without naming the owner | `code`                      | B    | partially red       |
| `observability-no-stale-skill-id`     | A `rule-mcp-...` id with no skill directory                                             | `code` + `context.fileList` | B    | clean               |

## Phase 0 - Decisions

- [ ] ADR (area): the devops family shape, including the boundary with the AI
      leaves on agent telemetry.
- [ ] ADR (area): the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/devops-observability/`: `clean/`, `unredacted-payload/`,
      `trace-without-versions/`, `alert-without-slo/`, each with a one-line
      `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-devops-observability`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-devops-observability/guardrails/`: six rule files plus
      `index.js`.
- [ ] `guardrails:` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Keep the contradiction section and cite it

- [ ] Link the contradiction section from the sampling rules, so a reader who
      lands on "sample deliberately" also lands on "keep every agent trace".
- [ ] Name the owners for the harness and evaluation sections.

## Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-devops-observability/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Catalog scan with the six rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                                 | Class       | Model                     | Why                            |
| ---------------------------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions                                  | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red)                       | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules                                  | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Keep the contradiction section and cite it | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Verification                               | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-devops-observability/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-devops` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- The undocumented self-contradiction section should be copied, not fixed. It is
  the honest form of a trade-off, and most skills in this catalog would rather
  repeat an absolute than admit the exception.
- Tracing agents is the newest material here and the most likely to rot: the
  versioning rule is the one that keeps it useful, because it makes the trace
  answer "what changed" instead of "what happened".
- This leaf is the natural place to state the redaction rule once for the whole
  catalog, which is why the rule ships here rather than in `rule-backend-security`.
