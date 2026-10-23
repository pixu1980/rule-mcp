# decision-models plan

Status: `planned`
Notes: Outside the skills graph: this plan covers the router's decision layer, not a skill, so it is not a node in `docs/plans/skills/skills-plan.md`. Moved from `feat/decision-models` by the Stage 1 fold; `feat/guardrails` owns it.

- **Role**: decision-models v1
- **Date**: 2026-10-20

Steps re-derived from the open findings in [the review](../reviews/decision-models.md) on every run, worst first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its finding stays open. This file is deleted by the run that finds nothing open.

## What the measurements say

The obvious proposal, "let a decision model route the prompt instead of BM25", is the one the numbers refuse. BM25 already reaches the intended skill exactly on 77 of 95 corpus prompts and within the alternatives on 90. Given the 13 misses where the intended skill was already in the shortlist, Laya picked it 3 times; given the same prompts with all 83 skills as options it picked it once and was confidently wrong. So the plan does not replace the ranker.

What a decision model does give is three things BM25 cannot: a probability instead of a normalized score, a way to answer "I do not know" that a caller can threshold, and a second language. Each of those is a workstream below with a number attached, and each carries a kill criterion so a step that does not move its metric is not shipped.

## Where it helps, and where it does not

| Flow                       | Today                                       | Measured or expected effect                                                                         | Verdict                                          |
| -------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Skill routing, English     | 81% exact, 95% top-or-alternative, BM25     | Reranking the top five fixes 3 of 13 misses; catalog-wide picking fixes 1 of 13                     | Do not replace; add a gated second opinion       |
| Routing confidence         | `confidence: 1` even for `unknown`          | A `choice` returns a distribution over the shortlist, which is what the field claims to be          | Build, behind a flag, with a calibration gate    |
| Routing, non-English       | 3 of 4 Italian prompts route to `unknown`   | Untested against a multilingual model: Laya is English-only, Julia-1 covers 50+                     | Build the harness and the model registry first   |
| Slash-command intent       | A frozen English and Italian keyword list   | The list is small and stable; a 65 ms call per command is not obviously better                      | Not worth it now, revisit with the language work |
| Guardrails                 | 88 structural rules, `advisory` rarely used | Meaning-level properties (a README opening, an alt text that says nothing) are unreachable by regex | Build as advisory only, never blocking           |
| Personas                   | Severity assigned by the agent              | A `score` over one finding is cheap and deterministic; the benefit is unmeasured                    | Last, and only after the score shape is proven   |
| Compression level          | Rule-based, per text shape                  | A `score` per tool result adds 65 ms to a path that runs on every response                          | Rejected: cost on the hot path                   |
| Handoff claim verification | `handon` re-reads the repository            | A `noul` per claim could triage what to verify first; the claim set is already small                | Rejected: not the bottleneck                     |

## Recommended models

The audit tested two artifacts: `ggml-org/Laya-GGUF:Q8_0`, which is a decision model, and `prithivMLmods/APUS-OpenJev-v1-9B-GGUF:Q5_K_M`, which is a chat model that answers `501` to the endpoint. The plan therefore recommends by job, not by the two that happen to be installed.

| Model              | Size | Languages     | Fit here                                                                                          |
| ------------------ | ---- | ------------- | ------------------------------------------------------------------------------------------------- |
| `Julia-1`          | 144M | 50+           | The multilingual default: smallest, fastest, and the only way to fix Italian routing              |
| `Laya`             | 421M | English       | The English default, and the one measured here: 0.42 GB, 519 ms load, 65 ms warm                  |
| `Kev-4B`           | 4B   | English       | The quality step-up for English when Laya's confidence is not separable                           |
| `lev`              | 4B   | English       | Same slot as Kev-4B; choose one, not both                                                         |
| `OpenJev` / `Clef` | 27B  | multi, images | Only if an image question appears; 6 GB and up does not fit a 16 GB laptop with the rest resident |

A model is a configuration value, never a hard-coded id: the registry in WS-3 reads the id, the size, the languages and the context, and refuses a model whose context cannot hold the shortlist. Anything the registry does not know still works, because BM25 is the fallback and the feature is off when no model is named.

## Dependency graph

```
WS-0  loopback client and contract      (DM-03, DM-12)
  |
  +--> WS-1  supervisor and circuit breaker   (DM-06)
  |       |
  |       +--> WS-6  semantic advisory rules  (DM-08)
  |                |
  |                +--> WS-7  persona severity (DM-10)
  |
  +--> WS-2  measurement harness and corpus repair (DM-02, DM-09)
          |
          +--> WS-3  probability, shortlist cap, model registry (DM-01, DM-05)
                  |
                  +--> WS-4  language                     (DM-04)
                  |
                  +--> WS-5  deterministic cache           (DM-07)
                          |
                          +--> WS-8  env, ADR, census, docs (DM-11)
```

Every workstream owns files no other workstream writes, so two of them can run in either order but never at the same time on the same file: WS-0 writes the client, WS-1 the supervisor, WS-2 the harness and the corpus, WS-3 the ranker contract, WS-4 the registry and the language slice, WS-5 the cache key, WS-6 and WS-7 the rule family, WS-8 the documents.

Depends on: -

Feeds: -

Shared files: none: outside the skills graph, and it owns `src/core/decision/`

## Steps

Dependencies: WS-0 first and alone, because every later step calls it. WS-1 and WS-2 can then run in parallel. Nothing in WS-3 starts before WS-2 has published a baseline, because a reranker without a ruler is a guess. WS-6 is independent of the whole routing branch and may be pulled forward if the semantic rules matter more than routing. WS-8 last: the counts it edits are enforced by tests, so it must describe what shipped, not what was planned. No step turns a feature on by default; each ships off, with the flag documented next to the environment variable that enables it.

- [ ] **Step 5 - DM-04 (high)**: Non-English prompts route to `unknown`, and the installed model cannot read them
  - [x] **5.1**: Failing test: an Italian slice of the corpus (the four prompts measured in the audit plus enough to be meaningful) records the current 3-of-4 `unknown`, so the gap is a test and not an anecdote.
    - Note: the audit's four Italian prompts were not recorded. The slice is eight new prompts in `tests/fixtures/routing-corpus-it.mjs`; the measured baseline is 2/8 exact, 3/8 top-or-alternative, 5/8 `unknown`, not the audit's 3-of-4.
  - [x] **5.2**: Implement the model registry: id, size, languages, context, per-model threshold, and a shortlist cap it can hold; unknown models fall back to BM25 instead of failing.
  - [x] **5.3**: Choose the model by the language detected from the prompt, with Julia-1 as the multilingual entry and Laya as the English one; do not load both on a single-instance router without measuring the swap cost.
  - [ ] **5.4**: Gate: the Italian slice improves against its recorded baseline and the English slice does not regress; a router with one slot must show the swap cost in the same table.
    - Note: the auto selection is proven with a fake model (Julia-1 for Italian, Laya for English) and the runtime unloads the previous model before switching. Julia-1 is installed as `ggml-org/Julia-1-GGUF:Q8_0`; the live Italian slice still measures 2/8 exact, 3/8 top-or-alternative and 5/8 `unknown`, so per the kill criterion the harness and registry ship and the Italian routing claim stays dropped. The English corpus stays 77/95 exact and 91/95 top-or-alternative with the feature off. A live run measured 1415 ms for the cold Italian call and 216 ms for the Italian-to-English call, swap included; the third Italian call answered from the decision cache with no router request.
- [x] **Step 8 - DM-10 (low)**: Persona severity is assigned by the agent and two runs can disagree
  - [x] **8.1**: Measure first: take an existing review's findings, ask the model to score each severity, and record agreement with the human labels; if agreement is not clearly better than the agent's own, close the step as rejected.
    - Note: rejected at measurement. The existing review labels are the agent's own severity assignments, so comparing the model against them is circular unless an independent human-labeled set exists; none does. No normalizer ships and the agent's labels stand.
  - [x] **8.2**: If it survives 8.1, implement a severity normalizer that maps a `score` answer onto the review's existing severity ladder without inventing a level it does not have.
    - Note: not implemented; 8.1 rejected the step.
  - [x] **8.3**: Gate: the trio validator still passes, a re-sync keeps the severities it wrote, and the step is deleted if 8.1 rejects it.
    - Note: the normalizer is deleted; the trio validator is unaffected because no severity was written.

## Debt and live gaps

- Five pre-existing 150-line offenders remain: `src/cli/_init.js` 151, `src/core/__tests__/_prompt-directive.test.mjs` 152, `src/core/guardrails/project/_checks.js` 180, `src/core/self-update/_run.js` 202, `tests/plans/skills-plan.test.mjs` 338. The sixth, `src/tools/skill/_check-tool.js`, was split in Step 7.
- The live model-on corpus run and the severity agreement were not exercised; the Italian slice with Julia-1 was measured live (2/8 exact, 3/8 top-or-alternative, 5/8 `unknown`) and the decision-cache short-circuit was measured live (a cached Italian prompt after an English swap makes zero router requests). The recorded and fake runs are in ADR 156 and the review.
- The L3 decision-cache gate has two modes: shadow (`RULE_MCP_DECISION_CACHE_SHADOW=1`) records would-be replays and now labels each prediction against the gold route, while replay (`RULE_MCP_DECISION_CACHE_REPLAY=1`) is opt-in and off by default. The 0.9 floor is still provisional: `pnpm report:decision-cache` sweeps it and recommends a value only with zero false replays and enough labeled predictions. The gold oracle is route equality, and the report compares model time with compute time because a `pix_tool` replay may be a consistency tier rather than a latency win.
- The expanded local corpus (`pnpm audit:decision-cache`, 22 groups, 47 paraphrases, 8 negatives) has no safe floor: Laya produced 23 predictions and 5 wrong choices at lower floors (31/47 coverage), Julia 36 predictions and 21 wrong at lower floors, 7 wrong at 0.90, 22/47 coverage. The eight unseeded negatives were no-candidates for both. Replay stays off; the blocker is recall and model accuracy, not the floor. The gate call was faster than the gold call in both (Laya 65 vs 143 ms, Julia 17 vs 94 ms).
- The commit-lint closeout archived this plan while DM-04 and DM-10 were still open; the plan was restored with the 5.4 gate open so it is not archived again.

## Kill criteria

Each of these stops a step instead of shipping it, and each is a number a test can print.

- If the shortlist reranker does not raise exact above the Step 3 baseline on the corrected corpus, the feature ships off and Step 4 is closed as rejected.
- If the calibrated probability is not separable (correct answers and wrong answers have the same distribution), then `confidence` stays a score and Step 4 keeps only the shortlist cap.
- If the Italian slice does not improve with the multilingual model, Step 5 keeps the harness and the registry and drops the routing claim.
- If a semantic rule cannot reach 100% precision on its fixture corpus, it stays out of the family rather than shipping as an advisory that cries wolf.

## Non-goals

- No generative model, ever: the value here is one forward pass with a probability, and a chat model in the request path would cost seconds and tokens for a decision.
- No remote endpoint, in any configuration: the client refuses a non-loopback host by construction.
- No replacement of BM25: the ranker keeps recall over 83 skills, the model only arbitrates a shortlist.
- No decision call on the compression path or the per-response path, where the measured 65 ms would be paid by every answer.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                         | Class       | Model                    | Why                                                                   |
| -------------------------------------------- | ----------- | ------------------------ | --------------------------------------------------------------------- |
| 1 - loopback client and fake server          | `T3-rules`  | `kimi-k2.7-code`         | a small deterministic HTTP contract with a security invariant         |
| 2 - supervisor and circuit breaker           | `T3-rules`  | `kimi-k2.7-code`         | a state machine and counters, deterministic and testable              |
| 3 - measurement harness and corpus repair    | `T6-review` | `muse-wonder-full` (max) | evidence measurement and corpus judgment: the ruler before the rerank |
| 4 - probability, shortlist cap, gated rerank | `T3-rules`  | `kimi-k2.7-code`         | ranker contract and threshold logic                                   |
| 5 - language registry                        | `T3-rules`  | `kimi-k2.7-code`         | registry data and language selection                                  |
| 6 - deterministic cache                      | `T3-rules`  | `kimi-k2.7-code`         | cache key and invalidation contract                                   |
| 7 - semantic advisory rule                   | `T3-rules`  | `kimi-k2.7-code`         | one guardrail rule with its good and bad fixtures                     |
| 8 - persona severity measurement             | `T6-review` | `muse-wonder-full` (max) | agreement is measured first and the step may be rejected              |
| 9 - env, ADR, census, docs                   | `T1-plan`   | `gemini-4-argon` (high)  | ADR prose and counts, the riskier half of the step                    |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits, `gemini-4-argon` (high) for the ADR and prose in Step 9.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test src/core/decision/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus-it.test.mjs
node --import ./scripts/alias-hook.mjs scripts/audits/decision-models/corpus.mjs --check
node --import ./scripts/alias-hook.mjs scripts/audits/decision-models/index.mjs
pnpm census && pnpm census:check
pnpm lint
pnpm test:all
```
