# 075: Caveman compression is measured at its own step, and it is a small real saving

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: tokens, telemetry, caveman, evals
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Every flight export reported measuredSaved 0 with savedBySource.caveman 0, which left two readings: the compressor was not running where it mattered, or the saving was a story the server told about itself. Measured on a corpus of real results (recomputeCore over the router, four skill bodies and the caveman skill), compression removes 418 of 21889 tokens, 1.9 percent: nothing on the router, which answers in JSON and is skipped by design, 0.6 to 4.1 percent on prose-heavy skill bodies. So the compressor runs and does save. The zero came from the recorder: the router booked saved.caveman as core tokens minus final tokens, and final is the result after decorateWorkflowReminder has already added the workflow contract in the same step. Compression removing 50 tokens while the reminder added 127 netted to a negative, which the clamp turned into 0. kpi.cavemanRatio was derived from the same subtraction and reported the same zero under the label "Caveman compression".

## Decision

The saving is measured across the compression step alone. finalizeResult became finalize(name, core), which returns the final result and cavemanSaved, the difference between the reminded result and the compressed one, and the router records that number instead of the core-to-final delta. kpi.cavemanRatio is derived from the measured saving over coreTokens rather than from core minus final, so the percentage under "Caveman compression" is now a compression ratio. The claim stays in stats and docs because it is now true and small: a real 8-call session records measuredSaved 504 tokens and a ratio of 1.9 percent, where both were 0 before. test/caveman-efficacy.test.mjs is the eval the plan asked for and blocks in ci: it runs the corpus through the compressor and asserts a saving above 1 percent, that the router's JSON payload is returned byte for byte, that fenced code, URLs, headings, table rows and inline code survive unchanged, that compression is idempotent, and that what the recorder books is what the compression step removed.

## Consequences

savedBySource.caveman and cavemanRatio become non-zero on every session with prose in it, so any dashboard or note that quoted the old zero is now wrong and the flight exports from before this change are not comparable with the ones after. The honest size of the effect is now visible: roughly 2 percent, an order of magnitude below what the reminder used to cost before ADR 073, which is the context anyone quoting the number should carry. reminderOverhead is still finalTokens minus coreTokens, so it is net of compression: the same 8-call session reports 0 overhead because compression removed more than the diet-sized reminder added, which understates the reminder and is a follow-up, not a claim this ADR makes. Cache hits still record no compression saving at all, so the reported total remains a lower bound on a cache-warm session. The corpus in the eval is this server's own skills, so a skill rewrite can move the ratio; the assertion is a floor of 1 percent rather than a fixed number for that reason.

## Alternatives Considered

1. Drop the claim entirely and stop counting caveman: the saving is small, but it is measurable, preserved and free, and removing a true number to avoid explaining a small one is the wrong trade
1. Compress harder to make the number bigger: every rule added is a new way to lose substance, and the preservation half of the eval is the half that protects the reader
1. Leave the recorder alone and explain the zero in the docs: a metric that needs a paragraph of apology is a metric nobody trusts
1. Report compression before the reminder is added by reordering finalize: the reminder is prose and benefits from the same pass, and reordering would ship a longer result to save a nicer number
