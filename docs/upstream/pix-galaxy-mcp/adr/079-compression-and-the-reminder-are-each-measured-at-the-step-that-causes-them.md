# 079: Compression and the reminder are each measured at the step that causes them

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: telemetry, tokens, cache, measurement
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

ADR 074 fixed how the compression saving was read and named two blind spots it left behind. Both have now been measured. A cache hit went through the same finalize step as a miss - compressed, then given a reminder - and recorded only the cache saving, so coreTokens, finalTokens and the compression figure were absent for every replayed call and every token total was a lower bound on a cache-warm session. And reminderOverhead was finalTokens minus coreTokens, which is the two effects of one step netted against each other: on a 16-call session where compression removed 1004 tokens and the reminder added 511, that difference is negative, the clamp turns it into zero, and the report says the reminder is free. The 8-call session in ADR 074 read exactly that zero.

## Decision

finalize returns reminderTokens beside cavemanSaved, both measured across the step that causes them: the reminder is the difference between the reminded result and the core, the compression is the difference between the reminded result and the compressed one. The recorder carries reminderTokens as its own field and kpi reports reminderOverhead from the sum of it. The cache-hit path calls finalize before recording rather than after, so a hit reports coreTokens, finalTokens, its compression saving and its reminder exactly as a miss does; its resultBytes is now the decorated result the caller actually receives rather than the undecorated core. A log written before the field existed has only the net difference to offer, so that stays as the fallback and is documented as such at the point of use. Measured on 16 calls, 8 of them hits: compression 504 tokens to 1004 once hits count, and reminderOverhead 0 to 511.

## Consequences

reminderOverhead and savedBySource.caveman both rise for the same traffic, so figures from before this change are not comparable with figures after it; the ratio between them is the number worth quoting, and on the measured session it is roughly two to one in compression's favor. reminderTokens is one more field per event in the JSONL, present only when a reminder was appended, which the cadence of ADR 073 means is a minority of calls. A cache hit now records a saving under two sources at once, cache and caveman, and both feed measuredSaved: they are different quantities and neither is double counted, but the cache figure remains the questionable one, since it counts the tokens of a replayed result as saved when the model still reads every one of them - what a hit actually saves is recomputation. That is the next thing in this area worth deciding, and this ADR does not decide it. The KPI regression fixture is unchanged because its events predate the field and exercise the fallback; a new case pins the measured path.

## Alternatives Considered

1. Derive the reminder as final minus core plus the compression saving: arithmetic over two measurements to recover a third that the step could simply report, and wrong the moment another pass touches the text
1. Leave cache hits unmeasured and document them as excluded: a footnote on every number, and the exclusion grows with the hit rate rather than staying small
1. Measure the reminder before compression by reordering finalize: the reminder is prose and benefits from the same pass, so reordering would ship a longer result to make a number easier to read
