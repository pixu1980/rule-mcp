# 163: Exclude the multilingual model from the decision-cache gate

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The leave-one-out corpus measured the multilingual model at 61 predictions and 37 wrong at 0.30, with 13 wrong at 0.90 (31.8% precision). The shorter prompt reached 45.8% at 0.90 but still no floor. Laya, the English model, reached 84.2% at 0.45 and 33 correct choices. The cache gate's questions are English and the multilingual model is overconfident on them.

## Decision

Exclude the multilingual model from the decision-cache gate. Julia stays on the routing decision and on the L0/L1 cache tiers; the L3 gate only runs with the English model. The replay stays off.

## Consequences

The Julia cache gate is off, so its overconfident cache picks can no longer replay or shadow. The routing decision and the deterministic tiers are unchanged. Laya remains the only L3 model and keeps its measured behavior. The benchmark with --model julia produces no gate records; the Laya LOO run is the measurement. The next is the recall/precision work on the English path.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A Julia cache prompt with zero false replays and ten labels at a usable floor would end the exclusion. A Laya floor would make the English gate the only one that matters and leave the multilingual path on routing.

## Alternatives Considered

1. Keep the shorter prompt for Julia: rejected because it reached only 45.8% at 0.90 and still no floor.
1. Build a model-specific cache prompt for Julia: deferred because the English question is the measured one and the multilingual path needs its own calibration.
1. Leave the gate on for Julia: rejected because 13 wrong at 0.90 is a silent-replay risk.
