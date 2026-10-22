# 156: Keep BM25 and gate a local decision model as a second opinion

- **Date**: 2026-10-22
- **Status**: proposed
- **Tags**: routing, decision-models, architecture, security, testing
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The decision-models audit measured a local llama.cpp `/v1/systemone` endpoint against the 95-prompt routing corpus. The first ruler was broken: three corpus `expect` values named skills that no longer exist (`backend-api-design`, `ai-agents`, `devops-gitlab-ci`), covering five prompts. This ADR is written after repointing those prompts at the surviving owners: idempotency to `backend-node`, the error contract to `backend-security`, retrieval to `ai-context-engineering`, and CI merge blocking to `devops-testing`; a structural test now fails if any `expect` names a skill the catalog does not carry.

Measured numbers:
- Audit baseline before the repair: 77/95 exact, 90/95 top-or-alternative, 3/13 fixed on a five-option shortlist, 1/13 on the 83-skill catalog.
- Live pre-repair on this checkout: 76/95 exact, 89/95 top-or-alternative.
- Corrected ruler after the repair: 77/95 exact (81.1%), 91/95 top-or-alternative (95.8%), recorded in `tests/fixtures/decision-models/corpus-baseline.json`.

The model is deterministic and loopback-only, but its `confidence` is a score, not a calibrated probability, and an unbounded option set made it confidently wrong (0.999 for a wrong catalog pick).

## Decision

1. BM25 remains the router. No generative model is in the request path and no endpoint but loopback is reachable: `createDecisionClient` refuses every non-loopback host by construction.
2. The model may only rerank the BM25 shortlist, capped at six options. Its pick replaces the BM25 pick only when the model's probability clears a per-model threshold recorded in the registry; otherwise BM25 wins. Laya's floor is 0.05 in `src/core/decision/_registry.js`, below the audit's 0.067-0.332 correct picks, so the three fixes the prototype found are not filtered out. The reranker ships off until the Step 4 gate passes.
3. The measurement command `scripts/audits/decision-models/corpus.mjs` runs the corpus with the model off and on, prints exact, top-or-alternative, per-model mean latency and input tokens, writes the run to `tests/fixtures/decision-models/corpus-baseline.json`, and `--check` compares a live model-off run with the committed numbers.
4. Step 4 kill criterion: the corpus exact rate must exceed 77/95 and top-or-alternative must stay at or above 91/95. If either regresses, the feature ships off and Step 4 is reopened as rejected rather than tuned until it passes.
5. The catalog experiment is measurement-only: 83 options are never a production option set.
6. The corpus names only current skills; the structural test is the guard against a retired name returning.

## Consequences

Positive: the baseline is a file and a command, not a memory; a model or router change is compared against the same 95 prompts; the model cannot send prompt text off the machine; the ranker cannot be silently replaced by a worse catalog-wide guess.

Negative: the model-on measurement needs a loopback router and a loaded model, so the committed 3/13 and 1/13 are the audit's recorded prototype numbers until the command is rerun with `--on`; the corpus repair moves the live baseline from 76/89 to 77/91, so the audit's historical 77/90 is not directly comparable to the corrected ruler.

## What would end this

If Step 4 cannot raise exact above 77/95 while keeping top-or-alternative at or above 91/95, the model is not worth the request-path cost and the feature is removed. If a deployment needs a remote endpoint, the decision layer is dropped rather than weakened: loopback is a construction rule, not a configuration default. If the installed model is not a decision model, the client falls back to BM25 instead of guessing from a successful load.

## Alternatives Considered

1. Replace BM25 with the model over the whole catalog. Rejected: 1/13 fixed, confidently wrong (0.999 on a wrong pick), and 83 options per request.
1. Use the model's confidence as a probability without a threshold or a shortlist. Rejected: the audit measured 0.067-0.332 on correct picks and 0.999 on wrong catalog picks; it is a score.
1. Ship the reranker without repairing the ruler. Rejected: five prompts named skills that no longer exist, so the 81% baseline was measured on an unaddressable target.
1. Use a remote hosted model. Rejected: privacy, latency and the non-goal of a network path.
