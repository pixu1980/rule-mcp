# 168: Insert a quick-start chapter and shift the handbook numbering

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: docs, handbook, process
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The handbook opened with install and architecture and reached the engineering guides at chapter 07. Those guides are the deep, repository-internal reference: the engineering loop, the guardrails, the docs pipeline, and the measured numbers. A reader who only wanted to use the server had no shallow page that showed init, check, fix, handoff/handon, personas, the cache, and the decision layer in one place. Stage 3.5 of the plan of plans asked for that page before the deep guide, and a numbered handbook cannot carry two chapters numbered 07.

## Decision

Create docs/07-quick-start.md as the shallow entry and shift the existing chapters 07-16 to 08-17. The engineering guides become chapter 08 and keep their depth; the generated inventories become chapters 09-17, so the generated documents remain the tail of the sequence that tests/docs/docs-handbook-numbering.test.mjs asserts. Update the README index, every live cross-reference, the census generators and their markers, the docs-site routes and tests, the tool-surface test, and the pre-commit hook. Historical ADRs and handoffs keep the paths they recorded; live plans follow the new numbers. Add tests/docs/quick-start.test.mjs to hold the chapter number, the eight flows, the link to the deep guide, and the index row.

## Consequences

A reader gets a short, practical entry before the deep guide, and the sequence stays gapless from 01 to 17. The generated documents still occupy the tail, so the numbering test keeps its invariant. The cost is a one-time reference sweep: any new document inserted before the generated tail must repeat it. The change is documentation-only and does not alter the runtime surface. Historical records remain readable at their original numbers, which can differ from the current handbook; the live index is the authority.

## What would end this

The split stops paying if the quick-start grows into a second copy of the engineering guides, or if readers skip it and the deep guide's flows drift out of sync. A handbook that no longer enforces gapless numbering, or an index that stops listing every chapter, would also make the arrangement wrong. In that case fold the quick-start back into chapter 08 and keep one entry rather than maintain two sources for the same flows.

## Alternatives Considered

1. Append the quick-start after the generated inventories: preserves existing numbers but hides the shallow entry at the end of the handbook.
1. Replace the engineering guides with the quick-start: removes the deep reference the repository workflow depends on.
1. Keep the quick-start unnumbered outside the sequence: avoids the sweep but breaks the index and the gapless-numbering invariant.
