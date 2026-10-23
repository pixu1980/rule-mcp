# 162: Name the skill and accept paraphrase in the decision-cache question

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The leave-one-out corpus showed Laya abstaining on 22 of the 53 covered prompts. The candidate criteria described the seed as prompt/route and the question asked for the same request, so a paraphrase looked different. The skill is the strongest signal the cache entry already carries. The prompt and description are the only change; the ranker, threshold, guards and replay stay as they are.

## Decision

Describe the cached candidate as request/skill and ask the model to accept a paraphrase when the skill and intent match, choosing none only when no candidate shares the intent. Keep the probability floor, the hard guards and the replay off until the report recommends a floor.

## Consequences

Laya's none fell from 38 to 24; predictions rose from 31 to 46, correct from 23 to 33, wrong from 8 to 13. The 0.45 precision rose to 84.2% (from 70.6%) but 0.60-0.75 got worse; no floor emerged. Julia at 0.90 fell to 31.8% (from 45.8%), so the multilingual path keeps its caveat. The model time rose from 72 to 94 ms with the longer prompt. The eight negatives stayed seven no-candidates plus one none. Replay stays off; the next is the precision/floor, with more samples or the route-aware filter.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A larger sample where the 0.45 gain disappears, or a floor with zero false replays and ten labels, ends the choice. A route-aware filter that removes the 0.60-0.75 errors would supersede the prompt; a Julia path where the 0.90 loss outweighs the Laya gain would keep the multilingual gate on the shorter prompt.

## Alternatives Considered

1. Revert to the shorter prompt: rejected because the shorter one abstained on 22 covered prompts and produced 10 fewer correct choices.
1. Try the route-aware filter next: deferred because the prompt change already uses the route the candidate carries and the floor is still missing.
1. Add more corpus groups first: deferred because the current 69 prompts already show the precision drop at 0.60-0.75.
