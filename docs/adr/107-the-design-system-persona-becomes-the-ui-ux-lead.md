# 107: The design-system persona becomes the UI/UX lead

- **Date**: 2026-09-18
- **Status**: accepted
- **Tags**: personas, ui, review
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The `design-system` persona owned design tokens, semantic HTML and component API design, but nothing owned the wider UI/UX surface: interaction patterns, motion, visual hierarchy, cross-framework parity and the accessibility baseline. Those concerns sat unassigned while the persona's five lenses covered only part of them.

## Decision

Rename the role id `design-system` to `ui` and its title to UI/UX Lead. Widen its lenses from five to ten - user goals, accessibility as baseline, semantics/tokens/styling order, component API durability, flex-first layout, purposeful motion, visual hierarchy, consistency via tokens, cross-framework parity, and industry standards as the floor. Expand evidence skills to include `rule-mcp-ui`, `rule-mcp-styleguide-a11y` and every frontend framework skill.

## Consequences

The active role set stays at 19; only the id and title change. The three commands per role become `/rule-mcp-persona-ui-plan`, `/rule-mcp-persona-ui-audit` and `/rule-mcp-persona-ui-review`. Evidence skills grow from four to thirteen, so the persona reaches every frontend skill and the a11y styleguide. Aliases, the persona catalog in `personas/`, the registry test and `docs/13-personas.md` follow. Any citation of the old `design-system` id is stale.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Add a new `ui` role and keep `design-system` alongside it
1. Widen the `design-system` lenses without renaming the role
