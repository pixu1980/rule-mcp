# rule-ai-evals - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#81`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: ai, leaf. **247 lines**, one file, no `guardrails/`, **no dispatcher row**,
no `inherits:`. Siblings: `rule-ai-prompting`, `rule-ai-context-engineering`,
`rule-ai-agent-architecture`, `rule-ai`.

## Evidence base (measured 2026-10-21)

Sections: error analysis first, a review interface pays for itself, reach for code
before reaching for a judge, one judge one failure mode with binary output,
calibrate the judge, correct the aggregate rate, evaluating RAG.

This is the most operationally specific skill in the area. Every section is a
practice with a failure mode attached, and the ordering is deliberate: look at
traces, then build the interface, then write code checks, then a judge, then
calibrate it. Most eval advice starts at the judge.

ADR 137 gives the area an `ai-eval-presence` rule (Tier B). This leaf adds the
three that make an eval worth running.

## The four rules

| id                             | Rejects                                                                                | Tier | Today         |
| ------------------------------ | -------------------------------------------------------------------------------------- | ---- | ------------- |
| `eval-error-analysis-first`    | An eval suite written with no trace review behind it                                   | B    | n/a           |
| `eval-judge-calibrated`        | An LLM judge with no agreement measurement against labels                              | B    | n/a           |
| `eval-binary-per-failure-mode` | A judge scoring several failure modes on one scale                                     | B    | n/a           |
| `eval-owner-named`             | A section delegating the harness, telemetry or review process without naming the owner | B    | partially red |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-ai` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] Implement ADR 137: the eight `ai-*` rules in `rule-ai/guardrails`, including
      `ai-eval-presence`, which is this leaf's floor.
- [ ] The four children declare `inherits: [rule-ai]` (ADR 137's open question).
- [ ] ADR: the AI family shape, superseding the proposed status of 137.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/ai-evals/`: `clean/`, `no-error-analysis/`,
      `uncalibrated-judge/`, `multi-mode-scale/`, each with a one-line
      `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-ai-evals`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-ai-evals/guardrails/`: four rule files plus `index.js`.
- [ ] `guardrails:` and `inherits: [rule-ai]` in the frontmatter.
- [ ] Green the Phase 1 suites.

### Phase 3 - Door and neighbors

- [ ] `rule-mcp` dispatcher row.
- [ ] The telemetry it assumes points at `rule-devops-observability`, which owns
      spans and cost per session: the two skills describe the same trace from
      different ends and neither links the other.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-ai-evals/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Door and neighbors   | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- `eval-judge-calibrated` is the rule that separates this leaf from the internet's
  eval advice: an uncalibrated judge measures the judge. It is also the only rule
  here that a reviewer can check by asking one question.
- The ordering in the body (traces, interface, code checks, judge, calibration)
  is the content worth protecting. A trim that keeps the judge and drops the
  error analysis would invert the whole argument.
