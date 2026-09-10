# 060: Plans carry nested sub-steps and an exhaustiveness mandate

- **Date**: 2026-09-07
- **Status**: accepted
- **Tags**: documentation, personas, plans
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

ADR 059 made persona plans checklists, but every step was one flat line: a step hiding five
actions ("rename, update the links, fix the writers, add the test number, run the gates")
could only be marked done as a whole, and its detail lived in a prose blob. Runs also tended
to produce uniformly short roadmaps - nothing in the machinery caps the step count, but
nothing in the persona contract demanded more either, so plans read like summaries instead
of the development-ready documents a 25-to-30-year expert would hand over.

## Decision

A finding passed to `rule_tool_plan_docs` may carry a `steps` array; the renderer nests each
entry as `  - [ ] **N.M**: <action>` under its step, and `planCheckedIds` keys sub-step marks
as `id#M` so a marked sub-step survives the sync exactly like a marked step. The persona
plan contract (the filled role template and the tool's follow-up text) now states the
expectation explicitly: as many steps as the findings demand - no fixed count - each split
into sub-steps whenever it hides more than one action, naming the files, the commands and
the gate that proves the step done.

## Consequences

Positive: execution is trackable at the action level, plans are development-ready documents
rather than summaries, and the uncapped-steps expectation is written where every persona
reads it. Negative: sub-step marks are keyed by ordinal, so reordering a finding's `steps`
array between runs re-derives the marks below it; the parser gains a second line shape.

## What would end this

Task tracking moving out of the plan files entirely (issues, task tools), making in-file
sub-step marks redundant.

## Alternatives Considered

1. Free-form nested bullets without the `N.M` key - unparseable, so marks could not survive
   the sync.
1. A separate tasks file per plan - two files to drift apart instead of one that cannot.
