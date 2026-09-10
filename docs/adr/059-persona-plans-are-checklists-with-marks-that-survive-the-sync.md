# 059: Persona plans are checklists with marks that survive the sync

- **Date**: 2026-09-07
- **Status**: accepted
- **Tags**: documentation, personas, plans
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

`rule_tool_plan_docs` rendered `docs/plans/<role>.md` as a markdown table (Step, Finding,
Severity, What it takes). A table cannot record execution: nothing marks a step as done, so
progress lived only in the reader's head, while the hand-maintained
`docs/plans/execution-plan.md` already tracked its phases with `- [ ]` checkboxes and proved
the affordance works. Worse, the plan is re-derived from open findings on every sync, so any
ad-hoc mark someone added would have been erased by the next run.

## Decision

The plan renderer emits a checklist instead of a table: one
`- [ ] **Step N - <finding-id> (<severity>)**: <what it takes>` item per open finding, worst
first, under a `## Steps` heading - the metadata of the old table folded into the item's bold
prefix. `planFindingIds` reads both the checklist and the legacy table so the validateTrio
gate keeps working across the transition, and a new `planCheckedIds` feeds the sync: a step
marked `[x]` stays marked while its finding is open, and disappears with the finding. The
audit and review keep their tables - they are data, not work to tick off.

## Consequences

Positive: executed steps are markable in place, the mark survives re-syncs, and every
persona plan reads like execution-plan.md. Negative: one more parser shape to maintain, and
a hand-combined step (`**Step 1 - DOC-1, DOC-2 (high)**`) must keep the id list inside the
bold prefix for the gate to see it.

## What would end this

A plan surface that tracks execution outside the file (issues, tasks), making in-file marks
redundant.

## Alternatives Considered

1. Keep the table and add a Status column - not clickable in editors and previews, and the
   sync would still have to parse cell text to preserve it.
1. A separate checklist file beside the plan - two files to drift apart instead of one that
   cannot.
