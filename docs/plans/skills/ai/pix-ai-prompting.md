# rule-ai-prompting - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#80`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: ai, leaf. **159 lines**, one file, no `guardrails/`, **no dispatcher row**
(zero occurrences in `rule/SKILL.md`), and no `inherits:` line. Siblings:
`rule-ai-evals`, `rule-ai-context-engineering`, `rule-ai-agent-architecture`, and
`rule-ai` (the router).

## Evidence base (measured 2026-10-21)

Sections: purpose, what a prompt actually needs, context engineering beats prompt
tricks, the mistakes that cost the most, learning mode for juniors, where to use
AI heavily, reviewing what comes back, when to stop prompting.

The writing is the strongest in the catalog and it is the only skill that admits
a boundary of principle: **"no code in, no code out"** in learning mode, so the
agent teaches instead of replacing the thinking.

None of it is enforced, and the area has no floor at all: ADR 137 (proposed,
2026-10-17) records that **five rule-ai skills exist and none owns a guardrail,
none declares `inherits`**. That ADR is the spine of this plan and of the four
that follow it; the eight rules it lists live in the router and reach the leaves
through inheritance.

## What this leaf adds on top of ADR 137

The router's eight `ai-*` rules are about agent code. This leaf is about the
prompt, and it owns three things ADR 137 does not name:

| Statement in the body | Rule |
| --------------------- | ---- |
| Point at files instead of pasting them | `ai-prompt-points-not-pastes` |
| In learning mode, no code in, no code out | `ai-prompt-teaching-no-code` |
| Review what comes back before it lands | `ai-prompt-output-reviewed` |

## The four rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `ai-prompt-points-not-pastes` | A prompt that pastes a whole file where a path would do | B | n/a |
| `ai-prompt-teaching-no-code` | A teaching-mode answer that writes the solution instead of the next step | B | n/a |
| `ai-prompt-output-reviewed` | Generated code merged with no review step named | B | n/a |
| `ai-prompt-owner-named` | A section delegating context, evals or lifecycle without naming the owner | B | partially red |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-ai` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] Implement ADR 137: the eight `ai-*` rules land in `rule-ai/guardrails`,
      advisory first, each citing OWASP / MCP / OpenTelemetry where the ADR says
      so.
- [ ] Answer ADR 137's open question: **the four children declare
      `inherits: [rule-ai]`**, the same model `rule-data` and `rule-backend` already
      use. This plan assumes yes; the ADR records it.
- [ ] ADR: the AI family shape, replacing the "proposed" status of 137 with an
      accepted one that includes the inheritance decision.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/ai-prompting/`: `clean/`, `pasted-file/`,
      `teaching-code/`, `unreviewed-merge/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-ai-prompting`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-ai-prompting/guardrails/`: four rule files plus `index.js`.
- [ ] `guardrails:` and `inherits: [rule-ai]` in the frontmatter.
- [ ] Green the Phase 1 suites.

### Phase 3 - Door and cross-links

- [ ] `rule` dispatcher row: the leaf has none today.
- [ ] The context-engineering section points at `rule-ai-context-engineering`
      instead of summarising it.
- [ ] The review section points at `rule-process-code-review`.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-ai-prompting/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests` | `deepseek-v4.1-flash` | test writing at the cheap end |
| Phase 2 - The rules | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Door and cross-links | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 4 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- This is the one skill in the catalog whose subject is how to talk to the agent
  reading it. That makes its rules unusually easy to violate in the same session,
  which is an argument for them being advisory rather than blocking.
- The learning-mode rule is the only place the catalog states a boundary of
  principle rather than a technique, and it deserves to survive the trim budget
  of every future edit.
