# 166: Keep the third corpus slice and leave the replay off

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The second slice measured 88/105 Laya coverage (83.8%) and 9 zero-false predictions at 0.55, one short of the ten-sample floor. The third slice adds three groups, three negatives and six historical paraphrases, bringing the corpus to 37 groups, 114 leave-one-out prompts, 74 history seeds and 16 negatives. Laya coverage rose to 97/114 (85.1%), but at 0.55 there are 8 predictions with 1 wrong and at 0.60 only 4; no higher floor reaches ten predictions.

## Decision

Keep the third slice for its recall, and leave the replay off. The next experiment is the model's choice or more samples above 0.60, not another corpus expansion at the current probability distribution.

## Consequences

The corpus is the best recall so far at 85.1%, but the floor still does not exist: the model's probability distribution puts too few predictions above 0.60 and one wrong at 0.55. Replay stays off. The third slice stays in the plan and in the benchmark; the next work is the model or a corpus that adds samples where the probabilities are high, not a lower threshold.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A model or prompt that puts ten zero-false predictions at 0.60+ ends the floor work and turns the replay on. Adding samples above 0.60 without lowering the floor would also close the count, but the model still owns the confidence.

## Alternatives Considered

1. Lower the floor to 0.55 with one wrong: rejected because a wrong replay is silent and the report requires zero.
1. Expand the corpus again at the same distribution: deferred because it moves the count slowly without changing the model's confidence.
1. Improve the model or prompt: the next experiment, because the 0.60+ bucket is too small.
