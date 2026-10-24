# 172: Retire closed plans into ADRs and one handoff

- **Date**: 2026-10-24
- **Status**: accepted
- **Tags**: plans, process, governance, docs
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

`docs/plans` holds 100 Markdown files: two closed plans (`plan-of-plans.md`, `plan-of-plans-reference.md`), two catalog documents (`skills/README.md`, `skills/DEPENDENCIES.md`), 10 open non-skill plans (146 open boxes) and 86 open skill plans (1,336 open boxes). The reference carries eight more follow-ups. The plan-of-plans is `Status: done`; the other 98 plan files are not. The user chose to retire only the closed plans and keep the open roadmap.

## Decision

Turn each closed plan into an ADR: 170 for the plan-of-plans, 171 for the reference. Add one handoff, 27, that indexes every plan and carries the eight reference follow-ups. Delete only the two closed plan files. Keep the 96 open plans and the two catalog documents. Delete the plan-of-plans test and its cross-branch helper; keep the skills plan test. Regenerate the ADR and handoff indexes with the docs-numbering doctor. The release PR #9 remains a separate release; the plan-of-plans and reference were already excluded from it.

## Consequences

The closed decisions are durable ADRs; the open roadmap stays in place with 1,490 open items (146 non-skill, 1,336 skill, 8 reference follow-ups), indexed by handoff 27. The plan-of-plans and reference paths disappear from `feat/evolution`; their links in historical reviews, ADRs and open plans remain as historical text, which the release tree already tolerated. The five pre-existing file-size offenders remain, including `tests/plans/skills-plan.test.mjs`.

## What would end this

The policy would change if a closed plan could not be compressed into an ADR without losing a decision, or if an open plan had to be deleted before its work shipped. The observation is an ADR that cannot state the plan's context, decision and consequences.

## Alternatives Considered

1. Delete every plan (1,490 open items would lose their detail)
1. Keep every plan (the closed files would stay as stale competition for the handoff)
1. Delete only the closed files without ADRs (the decisions would be lost)
