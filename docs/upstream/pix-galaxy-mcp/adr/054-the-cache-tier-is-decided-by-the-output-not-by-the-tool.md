# 054: The cache tier is decided by the output, not by the tool

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: cache, measurement, telemetry, determinism, routing

- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The result cache keyed on `sha256(namespace, tool, stableStringify(args))`, so "svelte store for shared state" and "Svelte stores for shared state?" were the same question and two entries. The plan called for a second tier keyed on the canonical form of the prompt, reusing the tokenizer the router already scores with so that "what a prompt means" has one definition in this codebase. It also called for measuring first, because P7 spent a phase optimizing descriptions after assuming they were the weight and finding they were an eighth of it.

The measurement is what redirected the work, twice. First: the search tokenizer emits the parts of a camelCase identifier alongside the whole token, which is what makes `IntersectionObserver` findable by "observer" and which makes the canonical form depend on capitalization - `TypeScript` produced three terms and `typescript` produced one, so the same question typed two ways still produced two keys. Second, and worse: the plan assumed a prompt-shaped field is safe to normalize wherever it appears. A skill tool in `mode=search` and `pix_search` both print the query verbatim in their own heading, so a normalized replay would hand back a header for a question nobody asked. And `rule` itself, which does not quote the prompt when it routes confidently, quotes it exactly when it cannot: the uncertain answer carries `No strong match for "<prompt>"`.

## Decision

Two mechanisms, because one is not enough. `canonicalizeQuery` in `src/core/bm25.js` is a canonicalizer and deliberately not the search tokenizer: it lowercases, stems, drops the stopwords plus a small interrogative list, deduplicates and sorts, and it does not split compounds. It stays conservative on content words - "build a react button" and "react button" remain two questions - because under-merging costs one miss while over-merging replays an answer to a question nobody asked and the caller cannot tell. The interrogative list is separate from the BM25 stopwords rather than added to them: the scorer sits at 87% with that list and canonicalization is a different job, where "how do I X" and "X" are the same question and for scoring every surviving term is another chance to match a heading.

The second mechanism is the one the measurement forced. Which fields may be canonicalized is an explicit allowlist, currently one entry, and that allowlist is necessary and not sufficient: on every store the result is checked for the raw argument value, and the L1 entry is written only when the answer does not quote the question. So the tier is decided per call, on the output. An uncertain route gets an L0 entry and no L1 entry, which is right twice over - it is the answer that quotes the prompt and the answer least worth replaying - and a future tool that starts echoing its input stops getting L1 entries without anyone remembering to check.

Every call now records the tier that answered it and the path it arrived on, `router`, `gateway`, `skill` or `action`, both aggregated and rendered by `pix_stats`. `scripts/cache-report.mjs` runs the routing corpus cold, warm and rephrased, and `RULE_MCP_CACHE_EXACT_ONLY=1` turns the new tier off, because measuring an improvement needs a switch and not a simulation of one.

## Consequences

On the 53-prompt routing corpus, a rephrased pass replays 0% with the exact key alone and 98% with the normalized key, and the floor is held at 80% in `test/cache-tiers.test.mjs` alongside the assertion that L0 alone scores exactly zero. A cache hit now reports its tier in `_meta.pixCache`, which is a deliberate difference between a hit and a miss and the second one after the reminder's full-once-then-terse state: a cache that cannot say where an answer came from is one nobody can debug. `mode=tldr` does not echo its query and is the obvious next candidate for the allowlist, but it selects sections through BM25 and whether a deduplicated sorted query scores identically is a claim that needs its own test, so it is not in. The entry-path split is the number R8 was gated on, and it is now being recorded rather than argued about.

## Alternatives Considered

1. Normalize any field named `prompt` or `query`. Rejected by measurement: two of those fields reach the output verbatim, and the replay would be visibly wrong.
2. Detect the echo by transformation rather than by substring, so a lowercased or reformatted quote is also caught. Rejected for now: the substring check is exact for the cases that exist, and a general answer to "did this output derive from this input" is not something a cache should be attempting.
3. Add the interrogatives to the shared BM25 stopword list. Rejected: routing is measured at 87% against that list and a scorer change belongs in its own phase with its own number.
