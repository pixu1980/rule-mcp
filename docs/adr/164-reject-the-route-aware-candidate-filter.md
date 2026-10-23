# 164: Reject the route-aware candidate filter

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The wide leave-one-out corpus measured the BM25 single-batch gate at 78/105 Laya coverage (74.3%). The route-aware experiment computed the router's BM25 top skill and used it to filter the cached candidates, with a fallback to the full set when no candidate matched. The cached entries carry the post-decision route, so the BM25 hint and the cache route disagree on ten cases and the filter drops the correct seed. Coverage fell to 68/105 (64.8%), predictions to 58, wrong at 0.30 to 19; no floor emerged.

## Decision

Reject the route-aware candidate filter. Keep the BM25 ranker, the single batch and the replay off. The hint and its plumbing are reverted; the next recall experiment is seeding the corpus with the group's historical paraphrases, or improving the model, not another route filter.

## Consequences

The BM25 route is not the cache route: filtering by it removes correct seeds when the decision layer had overridden the route. The fallback only helps when no candidate matches, not when a wrong candidate matches. The reject leaves the Laya 74.3% coverage and 88 ms gate intact; the route-aware variant cost 105 ms and lost recall. Replay stays off.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A route hint that matches the cached post-decision route on every covered sample, or a cache whose entries are stored with the BM25 route, would make the filter worth re-testing. The Laya 74.3% single-batch remains the baseline it would have to beat.

## Alternatives Considered

1. Filter by the post-decision route: deferred because that route is what computeCore produces, so the gate would need the compute it is trying to avoid.
1. Seed the corpus with the group's historical paraphrases: the next experiment, because it tests the production cache without changing the gate.
1. Improve the model: the other next experiment; the route hint is measured and rejected.
