# 161: Measure the decision-cache gate with a leave-one-out corpus

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The one-seed-per-group corpus measured 31/47 Laya and 22/47 Julia coverage, but the production cache holds historical paraphrases, not one canonical prompt per group. The leave-one-out benchmark seeds each held-out prompt with the group's other prompts and the other groups' seeds; the negatives keep the one-seed-per-group cache. The BM25 ranker and the single batch are unchanged.

## Decision

Use the leave-one-out corpus for the decision-cache measurement. Each group prompt is a held-out live query; the cache contains its group peers and the other groups' seeds. The benchmark writes the same shadow records and keeps the replay off until the report recommends a floor.

## Consequences

Laya coverage rose to 53/69 (76.8%) and Julia to 34/69 (49.3%). Laya made 31 predictions and 8 wrong at 0.30, 2 at 0.55, 1 at 0.75; the none choice was 38 of 69, so the model, not the recall, is now the blocker. Julia made 60 predictions and 37 wrong at 0.30, 13 wrong at 0.90. The eight negatives stayed no-candidates (seven) or none. No floor reached zero false replays with ten labels; replay stays off. The prompt/description change (ADR 162) then cut Laya's none from 38 to 24 and lifted correct choices from 23 to 33, with wrong choices 8 to 13; no floor.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A floor with zero false replays and ten labels ends the work. A Laya run where the none choice is justified by the peer prompts not being the same request would move the blocker back to recall. A prompt or description change that turns the 22 covered-but-none prompts into correct picks ends the model work; the route-aware filter is the fallback if it does not.

## Alternatives Considered

1. Keep the one-seed corpus: rejected because it understates the production cache and hid the peer recall.
1. Use the route-aware filter next: deferred because the LOO already lifts the recall and the model's none is the measured blocker.
1. Add more corpus groups first: deferred because the current 69 prompts already show the choice failure.
