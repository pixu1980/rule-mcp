# 158: Replay the decision-cache gate only behind a measured threshold

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The L3 gate has been shadow-only, and its model probabilities are not calibrated. Every shadow prediction is now labeled against the gold route from the fresh compute (route equality, with the entry's deps still holding), and the report sweeps the probability floor. A replay is only defensible at a floor with zero false replays and enough labeled predictions; the model call can also cost more than the pix_tool compute, so replay is not automatically a latency win.

## Decision

Add an opt-in replay behind PIX_GALAXY_MCP_DECISION_CACHE_REPLAY=1, off by default. It runs the same deterministic candidates, state, question, decision cache and hard guards as the shadow, but before compute: when the model chooses a candidate above PIX_GALAXY_MCP_DECISION_CACHE_THRESHOLD and every guard passes, it returns that cached core as tier decision, with choice and probability in _meta.pixCache. Replay wins when both flags are set, so a call is never replayed and shadowed twice. The shadow stays the default until pnpm report:decision-cache recommends a floor from real labeled traffic.

## Consequences

A wrong replay is silent, so the default remains off. The oracle is route equality with fresh deps, not full payload equality, and the report exposes unlabeled predictions. The model call runs before compute and may cost more than it saves on pix_tool; the report compares both times, and the tier is a consistency/cache tier when the model is slower. L0/L1 and the Nyx tier still answer first, and NON_CACHEABLE, errors, echoes, stale deps and PIX_GALAXY_MCP_NO_CACHE still win.

The expanded local corpus (`pnpm audit:decision-cache`, 22 groups, 47 paraphrases, 8 negatives) produced no safe floor with either model. Laya made 23 predictions and 5 wrong choices at lower floors; 31 of 47 paraphrases had the gold route in the candidates. Julia made 36 predictions and 21 wrong choices at lower floors, still 7 wrong at 0.90, with 22 of 47 coverage. The eight unseeded negatives were no-candidates for both, so the gate stayed safe there. The gate call was faster than the gold call in both (Laya 65 vs 143 ms, Julia 17 vs 94 ms); the blocker is accuracy, not time. Replay therefore stays off; the next run needs better candidate recall and a better model, not a lower floor.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A real sample where the chosen floor replays a wrong route, or too few labeled predictions to reach the minimum sample, ends the replay and returns the gate to shadow-only. A model time consistently above the compute time makes this a consistency tier, not a latency optimization, and it must not be enabled for latency.

## Alternatives Considered

1. Enable replay at 0.9 by default: rejected because the probabilities are uncalibrated and a wrong replay is silent.
1. Add another similarity tier or rely on Nyx: rejected because it needs an external adapter and the decided cache entry already exists.
1. Replay without labeling the shadow: rejected because there would be no measured false-replay rate.
