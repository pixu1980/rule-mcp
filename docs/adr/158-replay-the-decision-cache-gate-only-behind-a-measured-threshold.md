# 158: Replay the decision-cache gate only behind a measured threshold

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The L3 gate has been shadow-only, and its model probabilities are not calibrated. Every shadow prediction is now labeled against the gold route from the fresh compute (route equality, with the entry's deps still holding), and the report sweeps the probability floor. A replay is only defensible at a floor with zero false replays and enough labeled predictions; the model call can also cost more than the pix_tool compute, so replay is not automatically a latency win.

## Decision

Add an opt-in replay behind RULE_MCP_DECISION_CACHE_REPLAY=1, off by default. It runs the same deterministic candidates, state, question, decision cache and hard guards as the shadow, but before compute: when the model chooses a candidate above RULE_MCP_DECISION_CACHE_THRESHOLD and every guard passes, it returns that cached core as tier decision, with choice and probability in _meta.pixCache. Replay wins when both flags are set, so a call is never replayed and shadowed twice. The shadow stays the default until pnpm report:decision-cache recommends a floor from real labeled traffic.

## Consequences

A wrong replay is silent, so the default remains off. The oracle is route equality with fresh deps, not full payload equality, and the report exposes unlabeled predictions. The model call runs before compute and may cost more than it saves on pix_tool; the report compares both times, and the tier is a consistency/cache tier when the model is slower. L0/L1 and the Nyx tier still answer first, and NON_CACHEABLE, errors, echoes, stale deps and RULE_MCP_NO_CACHE still win.

The first local corpus run (`pnpm audit:decision-cache`, Laya, 30 samples) produced 11 predictions and 2 false replays: a 0.51 test-first pair and a 0.71 docker pair. The gold route was in the candidates for 18 of 25 paraphrases, and no floor reached zero false replays with at least 10 labeled predictions. Replay therefore stays off; the next run needs more groups, better candidate recall or a different model, not a lower floor.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A real sample where the chosen floor replays a wrong route, or too few labeled predictions to reach the minimum sample, ends the replay and returns the gate to shadow-only. A model time consistently above the compute time makes this a consistency tier, not a latency optimization, and it must not be enabled for latency.

## Alternatives Considered

1. Enable replay at 0.9 by default: rejected because the probabilities are uncalibrated and a wrong replay is silent.
1. Add another similarity tier or rely on Nyx: rejected because it needs an external adapter and the decided cache entry already exists.
1. Replay without labeling the shadow: rejected because there would be no measured false-replay rate.
