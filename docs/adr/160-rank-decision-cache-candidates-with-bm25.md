# 160: Rank decision-cache candidates with BM25

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The expanded corpus measured the candidate recall at 31/47 for Laya and 22/47 for Julia. The two-batch top-ten experiment (ADR 159) added no gold seed and was reverted. The current ranker is a set-based IDF-weighted overlap: it ignores term frequency and length normalization. BM25 over the same seed prompts adds both, using the existing bm25Score, while keeping the five-candidate cap and the single batch.

## Decision

Adopt BM25 as the decision-cache candidate ranker, with the existing five-candidate cap, the single batch, and the replay still off. The ranker is split out of the candidate builder and reuses the existing bm25Score; the tests cover the repeated-term saturation. The next experiment is the candidate recall, not another scoring swap.

## Consequences

Recall is unchanged (31/47 Laya, 22/47 Julia), so the ranker is still not the fix for the missing gold seed. Laya precision below 0.75 improves (0.50 92.9% vs 86.7%, 0.70 66.7% vs 50%), but the 0.90 floor has no Laya predictions, so replay stays off. Julia at 0.90 worsens (41.7% vs 58.8%) and at 0.95 (50% vs 66.7%); the Julia caveat is recorded. The model time is unchanged (Laya 62 ms, Julia 18 ms), and the eight negatives stay no-candidates. The leave-one-out corpus (ADR 161) lifted Laya coverage to 76.8% (53/69) and Julia to 49.3% (34/69); the model's choice is the next blocker. The prompt/description change (ADR 162) then cut Laya's none from 38 to 24 and lifted correct choices from 23 to 33, with wrong choices 8 to 13; no floor emerged.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A larger Laya sample where the 0.50-0.70 precision gain disappears, or a Julia path where the 0.90 loss matters more than the Laya gain, ends the adoption. A ranker that puts the gold seed in the top five ends the recall work and makes the replay measurement possible.

## Alternatives Considered

1. Keep the IDF-weighted overlap: rejected because its Laya precision at 0.50-0.70 is worse and the BM25 is the standard the project already ships.
1. Try the route-aware filter next: deferred because it changes the candidate contract and needs its own measurement.
1. Expand the seed prompts per group: deferred because it changes the corpus, not the gate.
