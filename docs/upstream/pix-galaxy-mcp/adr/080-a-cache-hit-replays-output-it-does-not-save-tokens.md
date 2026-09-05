# 080: A cache hit replays output; it does not save tokens

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: telemetry, cache, tokens, measurement
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

savedBySource.cache was the tokens of the result a hit replayed, added into measuredSaved under a heading that reads "Tokens saved". A hit returns the same text a miss would have returned, and the model reads every one of those tokens, so nothing was saved in the currency the total is denominated in. The scale of the overstatement is not marginal: on a 16-call session with 8 hits it was 26864 of 27868, so the headline number was roughly 27 times the real saving and moved with the hit rate rather than with anything the server did to shrink its output. What a hit actually avoids is recomputation, and this server runs no inference: measured over 2222 recorded calls in this repository, a miss takes about 2ms at the median and a hit about 0ms.

## Decision

The cache leaves the token accounting. The router records replayedTokens on a hit instead of saved.cache, kpi excludes a cache key from savedBySource so measuredSaved is compression only, and the Cache section of every report gains two honest lines: replayed output, in tokens, and the recomputation a hit avoids, as the median miss duration minus the median hit duration. A log written before this change carries saved.cache, and kpi reads it as replayed output rather than as a saving, so every historical export is re-read honestly instead of preserving the old number. The KPI regression fixture was regenerated in this commit, which is what its own failure message asks for when a definition changes deliberately: measuredSaved 1130 to 130, savedBySource {caveman: 130}, cache.replayedTokens 1000.

## Consequences

The headline saving falls by roughly the hit rate times the payload: from 27868 to 1004 on the session measured above, and from 1130 to 130 on the committed fixture. That is a large visible drop in a number the README points at, and it is the point of the change - the smaller number is the true one, and it is now comparable with reminderOverhead, which is the trade this server actually makes. Recompute saved is reported per hit as a difference of medians, which is a crude statistic on a small sample and reads as 0ms on any log where hits and misses are both sub-millisecond; it is honest about being small. replayedTokens is one more event field. Anyone comparing exports across this change will see measuredSaved fall without any behavior changing, so the version of the server that wrote an export matters when reading one.

## Alternatives Considered

1. Keep it and document that it means tokens not recomputed: a metric that needs a paragraph to stop being misread is a metric people quote without the paragraph
1. Drop the figure entirely: how much output the cache served is a real fact about the cache and worth reporting, just not as a saving
1. Count it as a saving only when the client would otherwise have re-read a skill file: that is estimatedRouting, which already exists and is already kept out of the measured total
