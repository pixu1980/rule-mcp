---
name: rule-ui
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

# rule-ui — UI umbrella and routing layer

`rule-ui` is the UI topic umbrella. It sits above visual design,
frontend frameworks, component templates, and styleguide validation so agents
can treat UI as a first-class topic, just like backend, data, DevOps, process,
platform, styleguide, and toolchain.

Use this skill when the user asks to create, redesign, polish, review, or
validate any visible interface.

## Routing contract

| User intent                             | Primary skill                                                 | Required companions                                                                                    |
| --------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Visual direction, aesthetics, UI polish | [rule-ui-design-system](../rule-ui-design-system/SKILL.md)      | [rule-styleguide](../rule-styleguide/SKILL.md)                                                           |
| Framework component implementation      | [rule-frontend](../rule-frontend/SKILL.md) or a framework skill | [rule-ui-design-system](../rule-ui-design-system/SKILL.md), [rule-styleguide](../rule-styleguide/SKILL.md) |
| Component template generation           | MCP `pix_component`                                           | `pix_check`                                                                                            |
| Accessibility review                    | [rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md)        | `pix_check`                                                                                            |
| CSS architecture                        | [rule-styleguide-css](../rule-styleguide-css/SKILL.md)          | [rule-styleguide-naming](../rule-styleguide-naming/SKILL.md)                                             |
| File tree and naming                    | [rule-styleguide-naming](../rule-styleguide-naming/SKILL.md)    | MCP `pix_fix`                                                                                          |

## Required workflow

1. Start with `rule` when task scope is ambiguous.
2. Use `rule-ui` to frame UI responsibilities.
3. Use `rule-ui-design-system` to define the aesthetic direction.
4. Use the framework skill (`rule-frontend-react`, `rule-frontend-vue`,
   `rule-frontend-svelte`, etc.) for implementation details.
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
- [ ] Visual direction is selected through `rule-ui-design-system`.
- [ ] Framework implementation skill is selected.
- [ ] Semantic HTML and accessibility requirements are mapped.
- [ ] CSS selectors avoid classes and inline styles.
- [ ] Component/file tree follows `rule-styleguide-naming`.
- [ ] `pix_component` is used where a template exists.
- [ ] `rule_tool_check` passes or reports known exceptions.

## See also

- [rule](../rule/SKILL.md) — Central skill and tool dispatcher
- [rule-ui-design-system](../rule-ui-design-system/SKILL.md) — Visual design direction
- [rule-frontend](../rule-frontend/SKILL.md) — Frontend framework routing
- [rule-styleguide](../rule-styleguide/SKILL.md) — Shared implementation standards
- [rule-architect](../rule-architect/SKILL.md) — Architecture and `.context` generation
