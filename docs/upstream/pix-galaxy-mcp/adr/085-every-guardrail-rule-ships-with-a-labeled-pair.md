# 085: Every guardrail rule ships with a labeled pair

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: guardrails, testing, evals, css
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The corpus covered 76 of 93 rules and the floor was a ratchet with a 17-rule gap, described as work left behind. The gap hid a defect for as long as it existed: css-comments-required probed for CSS rules with /[\\w-]\\s*\\{/, which never matches [data-part="card"] { - the selector this styleguide asks everyone to write - so an undocumented rule stylesheet passed the rule that exists to document it. Four of the seventeen were expected to need a file tree; all four turned out to be answerable from code plus a file name.

## Decision

34 entries close the gap: coverage is 93 of 93 rules over 186 snippets, precision and recall perfect on every one, and COVERED_RULES_FLOOR equals the rule count, so a rule shipped without a bad/good pair fails the suite rather than widening a gap nobody tracks. The naming rules need to know whether a file is a component, which no snippet can answer, so an entry states it with isComponent. The CSS probe now accepts ] and ) before the brace, still a single character class: the ReDoS corpus stays linear at 202ms.

## Consequences

The corpus has now found five defects, this being the fifth. A new rule cannot ship uncovered. The cost is 34 more snippets to keep honest, and a rule whose shape changes may need its pair rewritten rather than just its regex.

## What would end this

A rule arrives that no snippet can express - a file tree, a multi-file project, a repository state - and the floor has to describe a subset of the rules instead of all of them.
