# 057: No similarity tier above the normalized key, because no threshold both replays and replays correctly

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: cache, measurement, routing, tokens, correctness
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Step 4 of the deterministic cache plan called for L2: when the exact key (L0) and the normalized key (L1) both miss, score the incoming prompt against the prompts already cached and replay the closest one above a threshold. The plan set the gate that decides whether it ships, wrong replays must be zero, and pre-authorized the answer being no: a similarity layer that adds risk without adding hits is worse than nothing.

Steps 1 to 3 had already landed (ADRs 053 and 054), and L1 replays at least 80% of a rephrased corpus on its own. So the question L2 had to answer was narrow: what happens to the prompts canonicalization cannot merge, and can the closest cached neighbor be trusted to answer them.

That is a measurement, not a design choice, and P7 is the standing reminder of what happens when a phase optimizes before measuring. So the phase built the instrument instead of the layer.

## Decision

L2 is not built. The cache stays two tiers.

`scripts/cache-similarity-report.mjs` is the measurement. It caches one entry per routing-corpus prompt (62), generates four variants of each (a word shorter, a clause longer, the opener dropped, the tail swapped, which is what a second person plausibly types for the same question), discards the ones canonicalization already merges because those are L1's, and for each of the 224 that remain takes the closest cached prompt by Jaccard over canonical terms and compares the route that entry holds against the route the live router produces. A disagreement is a wrong replay: the caller receives an answer to a question they did not ask, with no way to tell.

| threshold | replayed | wrong | wrong rate |
| --------- | -------- | ----- | ---------- |
| 0.90      | 0        | 0     | n/a        |
| 0.85      | 8        | 1     | 13%        |
| 0.80      | 43       | 7     | 16%        |
| 0.75      | 97       | 21    | 22%        |
| 0.60      | 178      | 33    | 19%        |

There is no threshold with hits and zero wrong replays. At 0.90 the layer is inert, and the first threshold that replays anything is already wrong one time in eight. The gate fails everywhere, so the layer does not ship.

The plan's own safety constraint turns out to be unpayable, which is the second and structural reason. "Same route, or no hit" requires routing the incoming prompt, and computing the route means running the scoring loop over every skill (reading each one, name and tag affinity, the domain biases) and materializing each candidate's sections. That loop is the whole of what a router call does apart from serializing the payload: `searchSkills` alone is 18% of an 11ms call and the rest is the loop the route falls out of. A corroborated similarity hit therefore saves close to nothing, and an uncorroborated one is the 13% to 16% wrong replay measured above. Either the constraint or the saving has to go, and neither is worth having without the other.

`RULE_MCP_CACHE_EXACT_ONLY=1` keeps the meaning it acquired in ADR 053, L0 only. The plan described it as the switch that would turn similarity off; there is no third tier for it to gate.

## Consequences

The script is kept even though it produced a decision not to build. Without it the decision is an opinion, and the next person who wants L2 has to redo the work to find out it was already done.

`test/cache-tiers.test.mjs` gains "no tier above the normalized key is wired in", which asserts that every tier a lookup reports is `exact` or `normalized` and that a partially overlapping prompt misses rather than approximating. The absence is now deliberate rather than forgotten: a future tier changes that assertion, and it has to arrive with a report showing a threshold that has a non-zero hit count and zero wrong replays.

One honest wrinkle in the evidence. In several of the seven disagreements at 0.80 the cached route looks better than the live one. "remove em dashes and use american english" routes live to `rule-process-simplicity` while the cached neighbor holds `rule-styleguide-fingerprint`, and "error analysis on agent" routes live to `rule-mcp-agent-architecture` while the neighbor holds `rule-mcp-evals`. What the column measures is that routing is unstable under truncation, in both directions. That is a reason to distrust replay, not a reason to permit it: a tier cannot be safe when the thing it is corroborated against moves when one word is dropped.

It also names a routing question for a later phase, with a number attached: dropping the last word of a prompt should not change the route, and on this corpus it does often enough to be measurable. That belongs to the scorer, not to the cache.

Plan steps 5 (the gateway split, receipt test first) and 6 (the catalog) are unaffected, except that the catalog no longer has a second consumer: it was going to be the index L2 scored against, and now it exists only for the read surfaces.

## Alternatives Considered

1. Ship L2 at 0.90 anyway, where wrong replays are zero. Rejected: it replays nothing on 224 variants, so it is pure risk surface and dead code, and the first prompt that does clear 0.90 is unmeasured.
1. Accept the 13% wrong rate at 0.85 and report the approximation in _meta. Rejected: the plan's gate is zero, and traceability does not help a caller who cannot know the answer is to a different question. Eight hits are not worth one wrong answer.
1. Keep the same-route constraint and pay for the routing pass. Rejected on the measurement: the route cannot be had without nearly the whole call, so the hit saves almost nothing while still carrying the risk of the sections and payload differing.
1. Score with BM25 over the catalog instead of Jaccard, as the plan specified. Rejected as a change of instrument, not of outcome: the failure is that near-identical prompts route differently, which a better similarity function ranks more confidently rather than fixes. It would need the catalog built first, on the chance that a sharper score rescues a layer whose corroboration step is already unaffordable.
1. Delete the script now that the answer is known. Rejected: the script is the evidence, and a decision without its measurement gets relitigated.
