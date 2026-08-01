---
name: pix-ui
description: >-
  Use when designing or implementing user interfaces to route to the correct UI skill. Covers design systems, component patterns, accessibility, and styling tactics.
tags:
  - ui
  - frontend
  - design-system
  - accessibility
  - components
  - interaction-design
frameworks: [all]
---

# pix-ui — UI umbrella and routing layer

`pix-ui` is the UI topic umbrella. It sits above visual design,
frontend frameworks, component templates, and styleguide validation so agents
can treat UI as a first-class topic, just like backend, data, DevOps, process,
platform, styleguide, and toolchain.

Use this skill when the user asks to create, redesign, polish, review, or
validate any visible interface.

## Routing contract

| User intent | Primary skill | Required companions |
|-------------|---------------|---------------------|
| Visual direction, aesthetics, UI polish | [pix-ui-design-system](../pix-ui-design-system/SKILL.md) | [pix-styleguide](../pix-styleguide/SKILL.md) |
| Framework component implementation | [pix-frontend](../pix-frontend/SKILL.md) or a framework skill | [pix-ui-design-system](../pix-ui-design-system/SKILL.md), [pix-styleguide](../pix-styleguide/SKILL.md) |
| Component template generation | MCP `pix_component` | `pix_check` |
| Accessibility review | [pix-styleguide-a11y](../pix-styleguide-a11y/SKILL.md) | `pix_check` |
| CSS architecture | [pix-styleguide-css](../pix-styleguide-css/SKILL.md) | [pix-styleguide-naming](../pix-styleguide-naming/SKILL.md) |
| File tree and naming | [pix-styleguide-naming](../pix-styleguide-naming/SKILL.md) | MCP `pix_fix` |

## Required workflow

1. Start with `pix` when task scope is ambiguous.
2. Use `pix-ui` to frame UI responsibilities.
3. Use `pix-ui-design-system` to define the aesthetic direction.
4. Use the framework skill (`pix-frontend-react`, `pix-frontend-vue`,
   `pix-frontend-svelte`, etc.) for implementation details.
5. Generate deterministic templates with `pix_component` when possible.
6. Validate with `pix_check` before final handoff.

## Non-negotiable UI constraints

- Zero CSS classes.
- Zero inline styles.
- Semantic HTML before generic containers.
- External CSS or adoptedStyleSheets only.
- `data-part` and state attributes for selectors.
- WCAG 2.2 AA accessibility baseline.
- Visible focus and keyboard support.
- Reduced-motion behavior for animated UI.
- Barrel file tree and naming conventions.

## UI architecture checklist

- [ ] Purpose and primary user are stated.
- [ ] Visual direction is selected through `pix-ui-design-system`.
- [ ] Framework implementation skill is selected.
- [ ] Semantic HTML and accessibility requirements are mapped.
- [ ] CSS selectors avoid classes and inline styles.
- [ ] Component/file tree follows `pix-styleguide-naming`.
- [ ] `pix_component` is used where a template exists.
- [ ] `pix_tool_check` passes or reports known exceptions.

## See also

- [pix](../pix/SKILL.md) — Central skill and tool dispatcher
- [pix-ui-design-system](../pix-ui-design-system/SKILL.md) — Visual design direction
- [pix-frontend](../pix-frontend/SKILL.md) — Frontend framework routing
- [pix-styleguide](../pix-styleguide/SKILL.md) — Shared implementation standards
- [pix-architect](../pix-architect/SKILL.md) — Architecture and `.context` generation
