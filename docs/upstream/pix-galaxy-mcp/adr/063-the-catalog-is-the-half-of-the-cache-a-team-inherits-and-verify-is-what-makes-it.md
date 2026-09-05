# 063: The catalog is the half of the cache a team inherits, and verify is what makes it trustworthy

- **Date**: 2026-09-01
- **Status**: accepted
- **Tags**: cache, catalog, cli, determinism, tokens
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

R7, the last phase of the deterministic cache plan. The tiers were settled by R2, R3 and R5, so a catalog of them is no longer a catalog of something still moving.

The cache before this held only `{ result, deps }` under a hashed key. That is enough to replay and not enough to do anything else: a hash cannot be re-run, so nothing could check whether a stored answer still reproduced, and nothing could say which stored answers were worth sharing. The plan's own line for this phase was that a deterministic cache whose determinism nobody checks is an assumption.

## Decision

Two files with two purposes, because conflating them is what turns a catalog into a dump. `tool-cache.json.gz` in the state directory stays private, hot and freely evicted. `rule-catalog.json` in the project is the promoted subset, readable, sorted, and committed on purpose.

An entry now records the call that produced it, `tool` and `args`, and counts its reuses. Both were needed and neither existed. Promotion takes three reuses, because once is an accident, and every candidate is recomputed at export time and dropped if the answer has moved: an entry that no longer reproduces was already wrong here, and exporting it would spread it. `cache export` writes the file and a person commits it. The machine proposes, the team decides what it inherits.

The catalog loads under the local cache, through the ordinary keys, which is what keeps it from being a third tier. A lookup an inherited answer serves still reports `exact` or `normalized`, freshness still applies through the digests the entry recorded, and anything this machine computed wins. `test/cache-tiers.test.mjs` keeps asserting there are only two tiers, and that assertion stays true.

Four commands: `cache stats`, `cache verify`, `cache export`, `cache clear`, plus `cache prime` for loading a catalog by hand. `clear` never touches the committed file.

Comparison is against the deterministic core rather than the finished result, so `computeCore` was extracted out of `callTool` and `recomputeCore` exported beside it. Everything after the core, the reminder's once-then-terse state, compression, fingerprint removal, a banner, is expected to differ between two calls and says nothing about whether the answer moved.

An absolute path in the arguments disqualifies an entry from export outright. Scrubbing a value and hoping is worse than not exporting it, and ADR 061 already recorded that the gateway core carries a `path`.

## Alternatives considered

- **Store hits and arguments only for entries that look promotable.** Rejected: whether an entry will be reused is not knowable when it is stored, and the extra fields cost a few dozen bytes against a result measured in kilobytes.
- **Give the catalog its own lookup tier below the two existing ones.** Rejected: it would make the tier a fact about provenance rather than about retrieval, and it would break the assertion that pins the absence of a third tier.
- **Scrub absolute paths out of an entry before exporting it.** Rejected: a scrub that misses a case ships someone's home directory to a repository, and the entries carrying paths are the ones least worth sharing anyway.

## Consequences

**The first thing `verify` found was in this repository.** `postprocessToolResult` minted a fresh request id into every result, and its own docstring claimed the output contained nothing state-dependent and was safe to cache and replay. Both halves were wrong: two runs of the same call were never byte-identical, and a cache hit handed the caller the request id of whichever earlier call happened to populate the entry. The id is now stamped per call in `finalizeResult`, after the cache, on hits and misses alike. That is the rule ADR 061 applied to the gateway receipt, arrived at again from the other direction: an identity is minted, never replayed.

With that fixed, the full cycle was measured end to end against the real tools: two calls earned promotion, both recomputed identically, the written catalog carried no absolute path, a cleared cache primed two entries from it, and an inherited entry answered at tier `exact`.

The persisted cache format is version 3. An entry written before this records no call, so it can be neither verified nor promoted; rather than waiting for eviction, the call is filled in on the reuse that names it again, which is the one moment it is known. An entry whose core still carries a request id is dropped at load instead: it can never match a recompute, so it would be reported as drift forever. Running `cache stats` after the change emptied a cache of 197 such entries, which is the migration working rather than a loss.

`verify` skips an entry whose skills have moved. That entry is already dead and the next lookup evicts it, so reporting it would be reporting invalidation, which is the cache doing its job.

No catalog is committed here. Exporting one is a judgment about what an organization should inherit, and this repository's cache currently holds nothing reused three times.

`cache stats` reports a number worth knowing. Over the telemetry recorded so far, eleven calls were answered from the cache against roughly two thousand three hundred that were not. The synthetic rephrasing corpus that justified L1 measured 98%; a working session measures well under one percent, because the same call is rarely made twice by one person. The catalog exists precisely for the case that number describes: the second person to ask.
