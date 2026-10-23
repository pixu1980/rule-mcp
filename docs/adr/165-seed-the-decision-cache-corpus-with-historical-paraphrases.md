# 165: Seed the decision-cache corpus with historical paraphrases

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The wide leave-one-out corpus measured 74.3% Laya coverage with only the group peers in the cache. The production cache holds historical paraphrases, so the benchmark now seeds two historical prompts per group, each with its own gold route, while the live samples stay unchanged. The gate, the ranker and the batch stay as they are.

## Decision

Adopt the 68 historical paraphrase seeds in the corpus benchmark. The held-out live prompts, the negatives, the single batch, the BM25 ranker and the replay-off policy are unchanged.

## Consequences

Laya coverage rose to 88/105 (83.8%); predictions to 82. Wrong choices were 22 at 0.30 but 1 at 0.50 and 0 at 0.55, where 9 predictions were correct (one short of the 10-sample floor). No floor was recommended; replay stays off. The history seeds are the best recall so far; the next is a small third slice to put 10 predictions at 0.55, or the model.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A third slice that puts ten zero-false predictions at 0.55 would end the floor work and turn the replay on. A Laya run where the 0.55 gain disappears on more samples would move the work to the model, not the corpus.

## Alternatives Considered

1. Keep the peer-only cache: rejected because it understated the production cache and lost the historical recall.
1. Use the route-aware filter: already rejected in ADR 164 because the BM25 route is not the cached post-decision route.
1. Improve the model first: deferred because the 0.55 floor is one sample short, not one model short.
