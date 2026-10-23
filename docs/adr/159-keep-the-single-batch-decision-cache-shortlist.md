# 159: Keep the single-batch decision-cache shortlist

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The expanded paraphrase corpus measured the single-batch top-five gate at 31/47 gold-in-candidates for Laya and 22/47 for Julia, with no safe probability floor. The two-batch variant ranked ten candidates and asked the model in two batches of five plus none, aiming to recover the gold seed the top five missed. It did not add a single gold seed: coverage stayed at 31/47 and 22/47. It also made Julia worse at the 0.90 floor (15 replays, 9 wrong, 40% precision) than the single batch (17 replays, 7 wrong, 58.8%). The extra model call bought nothing.

## Decision

Revert the two-batch variant and keep the single five-candidate batch. The replay remains off. The next experiment is a better candidate ranker (BM25 or a route-aware filter) before any batching is reconsidered; batching can only help once the gold seed is in the top ten but outside the top five.

## Consequences

The top-ten pool did not change recall, so the ranker is the measured blocker, not the model's batch size. The single-batch gate keeps one model call per miss and the better Julia precision. The two-batch code and its tests are removed; the corpus and the audit remain the evidence. Replay stays off, and the report still gates any activation.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A ranker whose top ten adds a gold seed the top five misses, with enough labeled predictions and no false replay at the floor, would make the two-batch worth revisiting. A single-batch run that already reaches zero false with ten labels would end the ranker work and leave only the floor decision.

## Alternatives Considered

1. Keep the two-batch code behind a flag: rejected because it added a model call with no measured recall gain and worse Julia precision.
1. Lower the probability floor: rejected because the false replays rise and the corpus already shows no zero-false floor with ten labels.
1. Expand the corpus again before changing the ranker: rejected because more samples measure the same ranker; the ranker is the blocker.
