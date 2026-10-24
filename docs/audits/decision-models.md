# decision-models audit

- **Role**: decision-models v1
- **Date**: 2026-10-20
- **Scope**: the `/v1/systemone` endpoint llama.cpp added in PR #29818, exercised against the two candidate models installed on the local router at `http://localhost:9931`. Models are loaded and unloaded through the router API, not by the first request that names them. No model, preset or router setting was changed, and no request left the machine.

A decision model answers by scoring the options it is given instead of generating text: one state, typed questions (`choice`, `score`, `noul`), and one probability per option from a single forward pass. Three things were asked of the local install: what the router API does when a model is loaded on purpose, whether the endpoint answers at all, and whether it behaves the way the announcement describes.

## Environment

| What     | Value                                                                              | Source                |
| -------- | ---------------------------------------------------------------------------------- | --------------------- |
| Router   | `b11671-ba3c05f71`, role `router`, `max_instances 1`, autoload on                  | `GET /props`          |
| Endpoint | `http://localhost:9931`, `{"status":"ok"}`                                         | `GET /health`         |
| Machine  | 16 GB RAM, macOS, Node `v24.22.0`                                                  | `sysctl`, `node -v`   |
| Laya     | `ggml-org/Laya-GGUF:Q8_0`, 0.42 GB, context 8192, text only                        | `GET /models`, `stat` |
| OpenJev  | `prithivMLmods/APUS-OpenJev-v1-9B-GGUF:Q5_K_M`, 6.02 GB, context 262144, text only | `GET /models`, `stat` |

The announcement lists OpenJev as a 27B model that reads images. What is installed here is a 9B Q5_K_M community upload with text input only, so it is a different artifact that shares the name.

## Evidence

| What was measured | Command or file read                                                       | Output or observation                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Endpoint present  | `GET /v1/systemone`                                                        | `404`, because the route is POST-only: a GET probe cannot tell a missing build from a wrong method                                         |
| Explicit load     | `POST /models/load`, then `GET /models` until `loaded`                     | `200 {"success":true}` returns while the status still says `loading`; Laya settled in 519 ms, OpenJev in 8867 ms                           |
| Second load       | `POST /models/load` for a model that is already running                    | `400 model is already running`; for a router with one slot and the previous model not yet gone, `500 model limit reached, try again later` |
| Explicit unload   | `POST /models/unload`, then `GET /models` until `unloaded`                 | `200 {"success":true}`; the status keeps its old value until the child process exits, so the reply is not the end of the transition        |
| Endpoint answers  | `POST /v1/systemone` with one state and one `choice` question              | `200`, `{"choice":"billing","probabilities":{"billing":0.99...}}`, `usage.input_tokens 26`                                                 |
| OpenJev support   | `POST /v1/systemone` naming `prithivMLmods/APUS-OpenJev-v1-9B-GGUF:Q5_K_M` | `501`, `{"error":{"code":501,"message":"This model is not a decision model"}}` after a successful 8.9 s load                               |
| The whole run     | `node scripts/audits/decision-models/index.mjs`                            | the three tables below                                                                                                                     |

## Results

Both tables come from one run of the harness on the machine above, with every model loaded by `POST /models/load` before it is asked anything and unloaded after. Latency is wall time for the whole HTTP call, so every figure below is warm.

### Router

`http://localhost:9931`

| Model                                          | Status at discovery | Context | Inputs |
| ---------------------------------------------- | ------------------- | ------- | ------ |
| `ggml-org/Laya-GGUF:Q8_0`                      | unloaded            | 8192    | text   |
| `prithivMLmods/APUS-OpenJev-v1-9B-GGUF:Q5_K_M` | unloaded            | 262144  | text   |

### Requests

| Model                   | Probe     | Questions | Latency | Input tokens | Answers                                                              |
| ----------------------- | --------- | --------- | ------- | ------------ | -------------------------------------------------------------------- |
| ggml-org/Laya-GGUF:Q8_0 | billing   | 3         | 69 ms   | 167          | route=billing 0.9917 (conf 0.9876)<br>angry=0.7862<br>urgency=1.90   |
| ggml-org/Laya-GGUF:Q8_0 | shipping  | 3         | 64 ms   | 170          | route=shipping 0.7918 (conf 0.6877)<br>angry=0.1255<br>urgency=2.27  |
| ggml-org/Laya-GGUF:Q8_0 | technical | 3         | 65 ms   | 164          | route=technical 0.9483 (conf 0.9225)<br>angry=0.3030<br>urgency=2.59 |
| ggml-org/Laya-GGUF:Q8_0 | control   | 1         | 42 ms   | 67           | route=billing 0.9917 (conf 0.9876)                                   |
| ggml-org/Laya-GGUF:Q8_0 | bare      | 1         | 38 ms   | 36           | route=billing 0.9905 (conf 0.9857)                                   |
| ggml-org/Laya-GGUF:Q8_0 | repeat    | 3         | 70 ms   | 167          | route=billing 0.9917 (conf 0.9876)<br>angry=0.7862<br>urgency=1.90   |

### Summary

| Model                                 | Verdict                            | Load (explicit) | Route | Latency (median) | Confidence | Repeat delta | Batch delta | Bare labels           |
| ------------------------------------- | ---------------------------------- | --------------- | ----- | ---------------- | ---------- | ------------ | ----------- | --------------------- |
| ggml-org/Laya-GGUF:Q8_0               | decision model                     | 519 ms          | 3/3   | 65 ms            | 0.866      | 0.000000     | 100         | billing (conf 0.9857) |
| prithivMLmods/APUS-OpenJev-v1-9B-GGUF | This model is not a decision model | 8867 ms         | 0/0   | -                | -          | -            | -           | -                     |

The three battery states are a billing complaint, a late parcel and a login error. `route` is the only scored label, because it is the only one where "correct" is not a matter of taste: each state names its team in the first sentence. `angry` and `urgency` are recorded as observations.

## What the server does today

Measured on this checkout, before any change, so the plan argues from numbers and not from a hunch.

| Flow                 | Mechanism now                                                                                                          | Where it lives                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Skill routing        | BM25 over section text, plus name affinity, tag affinity, graph bonus, framework bias and two hard-coded domain boosts | `src/tools/ai/_rank-skills.js`, `src/core/bm25/`                                          |
| Routing quality      | 95 prompts, `77/95` exact (81%), `90/95` top-or-alternative (95%), floors at 78% and 93%                               | `tests/fixtures/routing-corpus.mjs`, `src/core/skills/__tests__/_routing-corpus.test.mjs` |
| Confidence reported  | `confidence` and `uncertain` on every answer, derived from the normalized score, not from a probability                | `src/tools/router/_compute.js`                                                            |
| Guardrails           | 88 deterministic rules (regex, AST, structure), with an `advisory` flag that reports without failing                   | `skills/*/guardrails/`, `src/core/guardrails/`                                            |
| Personas             | 20 persona documents, findings with a severity the agent assigns                                                       | `personas/`, `src/core/review/`                                                           |
| Slash-command intent | A frozen keyword list, English and Italian                                                                             | `src/core/agents/commands/_check-intent.js`                                               |
| Outbound HTTP        | None in the request path: no production module calls `fetch`                                                           | `src/`                                                                                    |
| Privacy stance       | "Everything this server records stays on the machine"; remote transport is off by a code constant                      | `docs/06-privacy.md`                                                                      |
| Configuration        | `RULE_MCP_*` environment variables, 30 of them today                                                                   | `src/`                                                                                    |

## Prototype measurements

Three experiments, each with the model loaded through `POST /models/load` and unloaded afterwards. The scripts lived outside the repository; the numbers they printed are the ones quoted by the review and the plan.

1. **Rerank the BM25 shortlist.** For the 13 addressable misses where the intended skill was already in the BM25 top five, Laya was asked a single `choice` over those five skills with their descriptions (200 input tokens, 79 ms per call). It picked the intended skill in **3 of 13**. The three it fixed are the ones whose leaf description states the topic (`platform-web`, `frontend`, `toolchain-pnpm`); it kept the BM25 answer where the corpus prompt is genuinely ambiguous (`styleguide-css` against `styleguide-baseline`, `ai-prompting` against `ai-evals`). Its confidence on the correct picks was low, 0.067 to 0.332, so a confidence-gated override would have fired rarely.
2. **Choose from the whole catalog.** The same 13 prompts, one call each, with all 83 searchable skills as options (355 input tokens, 173 ms). It picked the intended skill in **1 of 13**, and it was confidently wrong: `ui` with confidence 0.999 for a `platform-web` prompt, `styleguide` with 0.995 for a `baseline` prompt. The area routers read as plausible answers to almost anything, so a catalog-sized option set is worse than a shortlist and its confidence is not usable as a gate.
3. **Language.** Four prompts translated into Italian, compared with their English originals. BM25 answered `unknown` (with `uncertain: true`) on three and a wrong skill on the fourth, while the English originals reached a leaf skill. Every one of those answers reported `confidence: 1`, including the `unknown` ones, which is the clearest evidence that the field is a score and not a probability.

The numbers say the value is not in raw English routing accuracy. They put it in three other places: a probability instead of a score, a second language, and checks that no regex can express.

## Findings

1. **The router loads a model that the endpoint then refuses.** `POST /models/load` succeeds for OpenJev in 8867 ms and the first question comes back `501 This model is not a decision model`. The load API validates nothing about the model family, so a client that infers support from a successful load learns nothing. The model is a 9B Q5_K_M chat model from a community uploader, text only, while the announced OpenJev is 27B and reads images: same name, different artifact.
2. **Laya answers, and it answers correctly on this set.** 3 of 3 states reached the expected team, with the probability and confidence attached to each answer. That is three easy states, not an accuracy claim.
3. **The management API reports the state before the transition, not after.** `load` and `unload` both answer `200` while the status still shows the previous value, and `max_instances 1` keeps the old instance counted for a moment: a load issued right after an unload answers `500 model limit reached, try again later`. The first version of this audit read the reply and measured a 4 ms load for a model that then spent 611 ms on its first request. The harness now polls `GET /models` until the state it asked for is reported, retries the slot error for up to 30 s, and the numbers below are what that measures.
4. **An explicit load costs 519 ms for 0.42 GB and 8867 ms for 6.02 GB, and the request path is then 65 ms.** Holding a decision model resident is what makes it interactive; the load is the part to hide behind a warm-up, not to pay inside a user request.
5. **The endpoint is deterministic.** The repeat request in the same run and the whole audit across three runs produced the same probabilities to the last digit (`delta 0.000000`, `billing 0.9917`, `angry 0.7862`, `urgency 1.90`). A routing decision can therefore be cached, asserted in a test and explained after the fact, which is not true of a chat model.
6. **Batching saves state reads, not tokens.** Three questions on one state cost 167 input tokens; the same state with only the `route` question costs 67. The 100-token difference is the per-question instructions and criteria, so batching removes latency and repeated state encoding while the question text still bills.
7. **The "describe your options" tip did not reproduce on Laya.** The announcement reports Julia-1 sending "I was charged twice" to `shipping` with bare labels and to `billing` (0.99) once each option had a description. Laya answers `billing` either way (`0.9857` bare, `0.9876` described). The descriptions cost 31 input tokens here and changed no answer, so the tip is model-specific and has to be measured, not assumed.
8. **One confidence cutoff per model is still not enough.** Route confidence ran `0.9876` (billing), `0.6877` (shipping) and `0.9225` (technical) on states a reader would call equally easy. The per-model cutoff the announcement recommends needs a per-label spread before it is trustworthy.
9. **A `score` really can land between two levels.** Urgency returned `1.90`, `2.27` and `2.59` on a four-level legend, so a caller has to choose and document a rounding rule instead of reading the float as a label.
10. **A 404 from a GET says nothing about support.** The first probe of this audit used GET and concluded the build lacked the endpoint. Routing is per method, so a client-side capability check has to POST, or read the model's `architecture` from `GET /models` instead.

## Limits

- Three states, English, one label set. Nothing here ranks Laya against Kev-4B, lev, Julia-1 or Clef, none of which are installed.
- No image path was exercised: the only multimodal slot in the announcement belongs to the 27B OpenJev, and the installed one reports `input_modalities: ["text"]`.
- One quantization (Laya Q8_0), one machine, one router build, so the announcement's advice to compare precisions is untested here.
- Anger and urgency have no authoritative answer, so they are reported and not scored. The confidence figures are the model's own and are not calibrated against anything.
- The load figures are wall time to the state the router reports, which includes its own startup and health check, not just the weight copy.

## Reproduction

```bash
node scripts/audits/decision-models/index.mjs
```

`RULE_MCP_DECISION_URL` moves the base URL and `RULE_MCP_DECISION_TIMEOUT` the per-request ceiling, in milliseconds. For each model the harness unloads, waits for `unloaded`, loads through `POST /models/load`, waits for `loaded`, asks six questions, then unloads and waits again, so a 6 GB model is resident only while it is measured.

Files: `scripts/audits/decision-models/index.mjs` (orchestration), `_client.mjs` (HTTP and the decision request), `_models.mjs` (load, unload and waiting for the transition), `_probes.data.mjs` (states, questions, the one label), `_report.mjs` (tables).

## Corpus measurement

The routing ruler is the 95-prompt corpus, and its baseline is a file:

```bash
# model-off: BM25 over all 95 prompts
node --import ./scripts/alias-hook.mjs scripts/audits/decision-models/corpus.mjs

# compare the live model-off run with the committed baseline
node --import ./scripts/alias-hook.mjs scripts/audits/decision-models/corpus.mjs --check

# model-on: rerank the addressable misses, then the 83-option catalog
node --import ./scripts/alias-hook.mjs scripts/audits/decision-models/corpus.mjs --on --model laya --catalog --fixture
```

The corrected baseline on this checkout is **77/95 exact (81.1%)** and **91/95 top-or-alternative (95.8%)**, stored in `tests/fixtures/decision-models/corpus-baseline.json`. The fixture's model-on block is the audit's recorded prototype: **3/13** fixed on a five-option shortlist (79 ms, 200 input tokens) and **1/13** on the 83-skill catalog (173 ms, 355 input tokens). Rerun `--on` when a loopback router is available; `RULE_MCP_DECISION_URL` and `RULE_MCP_DECISION_TIMEOUT` move the endpoint and the per-call ceiling.

The Italian slice is a separate fixture, `tests/fixtures/routing-corpus-it.mjs`, because the audit's four prompts were not recorded. Eight prompts measure **2/8 exact**, **3/8 top-or-alternative**, and **5/8 `unknown`** on this checkout. `auto` selects Julia-1 for Italian, but the router carries no Julia-1, so the live Italian gate is not met and the routing claim is dropped.

Files: `corpus.mjs` (command), `_corpus-measure.mjs` (counting and question shapes), `_corpus-run.mjs` (BM25 and model runs), `__tests__/_corpus-measure.test.mjs` (the ruler's arithmetic and the fixture shape).
