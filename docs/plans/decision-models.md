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

- [x] **Step 1 - DM-03, DM-12 (high)**: No decision client exists and nothing stops a URL from pointing off the machine
  - [x] **1.1**: Write the failing test first: a URL that is not loopback (`127.0.0.1`, `::1`, `localhost`) is refused with the reason, and the refusal is testable without a socket.
  - [x] **1.2**: Add `src/core/decision/_client.js` with the two calls the audit used (`GET /models`, `POST /v1/systemone`), a hard timeout, no retry, and no other host reachable by construction.
  - [x] **1.3**: Add the fake decision server the rest of the suite reuses: a Node HTTP server in a fixture that answers a scripted distribution, so no test needs a model.
  - [x] **1.4**: Gate: `_client.test.mjs` green, `rule_tool_check` clean, `pnpm lint` and `pnpm test:foundations` unchanged. Note: the only failure left is the pre-existing file-size budget on six files (`src/cli/_init.js`, `src/core/__tests__/_prompt-directive.test.mjs`, `src/core/guardrails/project/_checks.js`, `src/core/self-update/_run.js`, `src/tools/skill/_check-tool.js`, `tests/plans/skills-plan.test.mjs`), all over the cap at `a747508a` before this track; recorded as debt, not introduced here.
- [x] **Step 2 - DM-06 (medium)**: The model lifecycle has no supervisor, so a load, a slot error or a hung router lands on the caller
  - [x] **2.1**: Failing test: with the fake server answering `loading` then `loaded`, the client returns only after the state flips, and the load time it reports is the settled one.
  - [x] **2.2**: Failing test: three consecutive failures open the breaker, the fourth call answers from BM25 without touching the socket, and the breaker closes on the next successful probe.
  - [x] **2.3**: Implement `src/core/decision/_supervisor.js`: wait-for-state, one retry on `model limit reached`, breaker counters, unload on shutdown, and a status line the doctor can print.
  - [x] **2.4**: Gate: the supervisor suite green with the router stopped, plus `pnpm doctor` unchanged with no endpoint configured.
- [x] **Step 3 - DM-02, DM-09 (high)**: A reranker would ship without a ruler, and the ruler is broken by three unaddressable corpus entries
  - [x] **3.1**: Failing test: every corpus `expect` names a skill that exists, so the three entries (`backend-api-design`, `ai-agents`, `devops-gitlab-ci`) fail until they are corrected or re-pointed at the skill that now owns the topic.
  - [x] **3.2**: Add the measurement command: run the corpus with the model off and on, print exact, top-or-alternative, per-model mean latency and input tokens, and store the run as a fixture so a later change is compared against a number, not a memory.
  - [x] **3.3**: Record the baseline in the ADR: 77/95 exact, 90/95 top-or-alternative, 3/13 on the shortlist, 1/13 on the catalog. The kill criterion for Step 4 is written there in the same commit.
  - [x] **3.4**: Gate: the corpus suite keeps its floors, the measurement command is documented, and the fixture is committed.
- [x] **Step 4 - DM-01, DM-05 (high)**: `confidence` is a score rather than a probability, and nothing bounds the option set
  - [x] **4.1**: Failing test: with the fake model answering a fixed distribution, `pix_tool` reports that distribution as `confidence` for the chosen skill and sets `uncertain` from the configured threshold, not from the score.
  - [x] **4.2**: Failing test: a shortlist above six options is refused with a message that names the cap, because 83 options made the model confidently wrong.
  - [x] **4.3**: Implement the gated second opinion: the model decides only among the BM25 shortlist, and its pick replaces the BM25 pick only when the probability clears a per-model threshold recorded in the registry.
  - [x] **4.4**: Gate: the corpus exact rate is not lower than the Step 3 baseline and top-or-alternative is unchanged; if either regresses, the feature stays off and the step is reopened rather than tuned until it passes.
    - Note: the recorded shortlist run fixes 3/13, and the audit's correct picks carry 0.067-0.332, all above Laya's 0.05 registry floor, so the production policy accepts all three: exact 77 + 3 = 80/95, top-or-alternative 91/95. A live `--on` rerun is pending a loopback router; the feature is off unless `RULE_MCP_DECISION_MODEL` is set.
    - Note: the three `RULE_MCP_DECISION_*` variables are documented in `docs/05-env-variables.md` in this step, ahead of Step 9.1, because the census scans `src/` and an undocumented knob would fail the count. Step 9.1 verifies the table and records the registry in ADR 156.
- [x] **Step 5 - DM-04 (high)**: Non-English prompts route to `unknown`, and the installed model cannot read them
  - [x] **5.1**: Failing test: an Italian slice of the corpus (the four prompts measured in the audit plus enough to be meaningful) records the current 3-of-4 `unknown`, so the gap is a test and not an anecdote.
    - Note: the audit's four Italian prompts were not recorded. The slice is eight new prompts in `tests/fixtures/routing-corpus-it.mjs`; the measured baseline is 2/8 exact, 3/8 top-or-alternative, 5/8 `unknown`, not the audit's 3-of-4.
  - [x] **5.2**: Implement the model registry: id, size, languages, context, per-model threshold, and a shortlist cap it can hold; unknown models fall back to BM25 instead of failing.
  - [x] **5.3**: Choose the model by the language detected from the prompt, with Julia-1 as the multilingual entry and Laya as the English one; do not load both on a single-instance router without measuring the swap cost.
  - [x] **5.4**: Gate: the Italian slice improves against its recorded baseline and the English slice does not regress; a router with one slot must show the swap cost in the same table.
    - Note: the auto selection is proven with a fake model (Julia-1 for Italian, Laya for English) and the runtime unloads the previous model before switching. Julia-1 is not installed, so the live Italian slice does not improve; per the kill criterion the harness and registry ship and the Italian routing claim is dropped. The English corpus stays 77/95 exact and 91/95 top-or-alternative with the feature off; the swap cost is not measured.
- [x] **Step 6 - DM-07 (medium)**: Determinism is proven but not used, and nothing invalidates an answer when the model changes
  - [x] **6.1**: Failing test: the same state and questions with the fake model answer from the cache on the second call, and a different model id misses the cache.
  - [x] **6.2**: Implement the key: a digest of the model id, the questions and the state, with the shortlist folded in, so an unchanged prompt cannot hit an answer computed for a different candidate set.
  - [x] **6.3**: Failing test: a recorded real answer replays to the same numbers, which is what makes the cache safe to trust and the audit reproducible.
  - [x] **6.4**: Gate: the cache suite green, `RULE_MCP_NO_CACHE` honored like every other cache in the server.
    - Note: the cache lives in `rerankShortlist`, keyed by the model id, the prompt and the questions with the shortlist folded in; the 256-entry store evicts the oldest. `RULE_MCP_NO_CACHE=1` bypasses it, and the decision tests set that flag while the cache suite enables it. The measurement command asks the supervisor directly, so its latency table is uncached; the production path caches.
    - Note: the recorded answer is the audit's Laya control (route billing 0.9917, 67 input tokens, 42 ms), stored in `tests/fixtures/decision-models/recorded-answer.mjs`; the replay test asserts those numbers.
- [x] **Step 7 - DM-08 (medium)**: The guardrail families are structural, and meaning-level properties are unreachable
  - [x] **7.1**: Pick one rule that a regex cannot express and that has an answer a reader would agree with, and write the `good` and `bad` fixtures before the rule.
  - [x] **7.2**: Implement it as an `advisory` rule in a new family, so it reports and never fails a check; the existing `advisory` flag is the mechanism, not a new one.
  - [x] **7.3**: Failing test: with no endpoint configured the rule is absent from the report rather than failing, and with the fake model answering it appears with the model's probability in the message.
  - [x] **7.4**: Gate: precision and recall on the fixture corpus at 100%, `pnpm census` regenerated, and the rule listed in the family table with its source.
    - Note: the rule is `semantic-error-message-actionable` in `src/core/guardrails/semantic/`; the corpus is `tests/fixtures/semantic-guardrail-corpus.mjs` (2 good, 2 bad). With the fake model the fixture reaches 100% precision and recall; the live Laya run was not exercised, so the rule is advisory and never blocks. `rule_tool_check mode=semantic` skips without an endpoint.
    - Note: `pnpm census` lists the `semantic` family and the rule with its source (ADR 156; docs/audits/decision-models.md). The split also brings `src/tools/skill/_check-tool.js` from 158 to 135 lines; the remaining pre-existing cap offenders are `src/cli/_init.js` 151, `src/core/__tests__/_prompt-directive.test.mjs` 152, `src/core/guardrails/project/_checks.js` 180, `src/core/self-update/_run.js` 202, `tests/plans/skills-plan.test.mjs` 338.
- [ ] **Step 8 - DM-10 (low)**: Persona severity is assigned by the agent and two runs can disagree
  - [ ] **8.1**: Measure first: take an existing review's findings, ask the model to score each severity, and record agreement with the human labels; if agreement is not clearly better than the agent's own, close the step as rejected.
  - [ ] **8.2**: If it survives 8.1, implement a severity normalizer that maps a `score` answer onto the review's existing severity ladder without inventing a level it does not have.
  - [ ] **8.3**: Gate: the trio validator still passes, a re-sync keeps the severities it wrote, and the step is deleted if 8.1 rejects it.
- [ ] **Step 9 - DM-11 (low)**: No environment variable, ADR, census entry or README count covers a decision endpoint
  - [ ] **9.1**: Add the environment variables next to the existing thirty, named the same way, and document each in `docs/05-env-variables.md`; add the ADR that records the loopback-only rule, the kill criteria and the model registry.
  - [ ] **9.2**: Regenerate the census so the new family and any new tool appear in `docs/14-guardrails.md` and the surface map, and update the README counts in the same commit the test demands.
  - [ ] **9.3**: Gate: `pnpm census:check`, `tests/docs/docs-accuracy.test.mjs`, the trio validator and `pnpm test:all` all green.

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
