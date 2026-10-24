# 152: Retire rule-mcp-frontend-vanilla-reactive and rule-mcp-frontend-custom-element

- **Date**: 2026-10-21
- **Status**: accepted
- **Tags**: skills, frontend, removal, breaking, detector, guardrails
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

rule-mcp-frontend-vanilla-reactive (696 lines, 9 guardrails, 4 rule tests, a demo spec and an examples tree) and rule-mcp-frontend-custom-element (350 lines, an examples tree and a scaffolder test) were the two heaviest frontend leaves and the two the catalog never exposed: both were missing from the rule-mcp-frontend router table (recorded in router-gaps) and from the dispatcher, so no reader could reach them. The owner decided on 2026-10-21 that the frontend area should not carry them.

## Decision

Delete both skills and every live trace: 107 files, the 9 vanilla rules and their tests, the demo spec exclusion in the suites data, the two router-gap entries, the persona evidence entry, the template-engine cross-links, the dispatcher rows and the six dispatcher descriptions that named vanilla-reactive, the plan index rows 49 and 54, the census family label for the retired guardrail mode, and the references in four plans. The framework detector loses its vanilla mapping and its unknown-framework fallback becomes rule-mcp-frontend, the frontend area router, because a fallback must point at a skill that exists and lists the others. The gateway test that asserted the old original route now asserts rule-mcp-frontend, which is where the same prompt lands. Both ids join the tombstone list in the retired-skills test.

## Consequences

The catalog drops from 83 to 81 skills, 105 to 102 tools and 174 to 170 resources. Nine guardrails leave with them, so the frontend area keeps five framework rules (react 2, vue 1, svelte 1, angular 1). The detector fallback changes from a leaf to an area router: an unknown framework now suggests rule-mcp-frontend, which is honest but less specific, and the router's own rules decide the next step. The plan index retires numbers 49 and 54 and keeps every other number stable.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Merge vanilla-reactive into the template-engine skill (rejected: the owner wants the surface smaller, not renamed, and the 9 rules would have moved with the body)
1. Keep custom-element because it is the only zero-dependency component skill (rejected: nothing routed to it, and the markup rules live in rule-mcp-styleguide-html)
1. Keep both and only open their doors (rejected: the doors were open-able, but the owner's call is removal, and ADR 152 records it rather than hiding it)
