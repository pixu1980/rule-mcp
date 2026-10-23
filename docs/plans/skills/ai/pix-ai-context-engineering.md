# rule-ai-context-engineering - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#82`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: ai, leaf. **195 lines**, one file, no `guardrails/`, **no dispatcher row**,
no `inherits:`. Siblings: `rule-ai-prompting`, `rule-ai-evals`,
`rule-ai-agent-architecture`, `rule-ai`.

## Evidence base (measured 2026-10-21)

Sections: context is a budget not a bucket, less context beats more, the levels of
delegation, retrieval over recall, compaction and handoff and starting fresh,
techniques that survive contact, what actually consumes a usage limit.

The last section is the one no other skill in the catalog has: it explains what a
usage limit actually spends, which turns a vague cost discussion into an
operational one.

ADR 137 does not cover this leaf, and the area's eight rules are about code. The
gap is real: every statement here is a budget decision, and a budget with no
number in it is a preference.

## The four rules

| id                                | Rejects                                                                            | Tier | Today         |
| --------------------------------- | ---------------------------------------------------------------------------------- | ---- | ------------- |
| `context-budget-stated`           | A delegation decision with no window or token budget named                         | B    | n/a           |
| `context-retrieval-over-paste`    | Whole files pasted where a path and a range would do                               | B    | n/a           |
| `context-compaction-at-threshold` | A long session with no compaction or handoff point defined                         | B    | n/a           |
| `context-owner-named`             | A section delegating prompting, evals or the handoff tool without naming the owner | B    | partially red |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-ai` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] Implement ADR 137 for the area floor; this leaf inherits it with
      `inherits: [rule-ai]` even though its own subject is not agent code.
- [ ] ADR: the AI family shape and the inheritance decision.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/ai-context-engineering/`: `clean/`, `no-budget/`,
      `pasted-files/`, `no-compaction-point/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-ai-context-engineering`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-ai-context-engineering/guardrails/`: four rule files plus
      `index.js`.
- [ ] `guardrails:` and `inherits: [rule-ai]` in the frontmatter.
- [ ] Green the Phase 1 suites.

### Phase 3 - Door and neighbours

- [ ] `rule` dispatcher row.
- [ ] The handoff section names `rule_tool_handoff` and `rule-process-ai`, which
      own the artifact; the compaction advice stays here.
- [ ] Cross-link from `rule-ai-prompting` instead of duplicating the budget idea.

### Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-ai-context-engineering/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Door and neighbours  | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- "Context is a budget, not a bucket" is the thesis of the whole area stated in
  six words. The rule set exists to stop the sentence from being decorative.
- The usage-limit section is time-sensitive in a way the rest is not: model
  limits change quarterly. It is the one section that deserves a review date when
  the frontmatter gains one (`rule-platform-auth` plans that mechanism).
