---
name: rule-mcp-ui
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

# rule-mcp-ui - UI umbrella and routing layer

`rule-mcp-ui` is the UI topic umbrella. It sits above visual design,
frontend frameworks, component templates, and styleguide validation so agents
can treat UI as a first-class topic, just like backend, data, DevOps, process,
platform, styleguide, and toolchain.

Use this skill when the user asks to create, redesign, polish, review, or
validate any visible interface.

## Routing contract

| User intent                             | Primary skill                                                           | Required companions                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Visual direction, aesthetics, UI polish | [rule-mcp-ui-design-system](../rule-mcp-ui-design-system/SKILL.md)      | [rule-mcp-styleguide](../rule-mcp-styleguide/SKILL.md)                                                                     |
| Framework component implementation      | [rule-mcp-frontend](../rule-mcp-frontend/SKILL.md) or a framework skill | [rule-mcp-ui-design-system](../rule-mcp-ui-design-system/SKILL.md), [rule-mcp-styleguide](../rule-mcp-styleguide/SKILL.md) |
| Component template generation           | the `rulemcp://templates` resource                                      | `rule_tool_check`                                                                                                          |
| Accessibility review                    | [rule-mcp-styleguide-a11y](../rule-mcp-styleguide-a11y/SKILL.md)        | `rule_tool_check`                                                                                                          |
| CSS architecture                        | [rule-mcp-styleguide-css](../rule-mcp-styleguide-css/SKILL.md)          | [rule-mcp-styleguide-naming](../rule-mcp-styleguide-naming/SKILL.md)                                                       |
| File tree and naming                    | [rule-mcp-styleguide-naming](../rule-mcp-styleguide-naming/SKILL.md)    | `rule_tool_check` with `rule-mcp-styleguide-file-tree`                                                                     |

## Required workflow

1. Start with `rule-mcp` when task scope is ambiguous.
2. Use `rule-mcp-ui` to frame UI responsibilities.
3. Use `rule-mcp-ui-design-system` to define the aesthetic direction.
4. Use the framework skill (`rule-mcp-frontend-react`, `rule-mcp-frontend-vue`,
   `rule-mcp-frontend-svelte`, etc.) for implementation details.
5. Read the template you need from the `rulemcp://templates` resource.
6. Validate with `rule_tool_check` before final handoff.

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
- [ ] Visual direction is selected through `rule-mcp-ui-design-system`.
- [ ] Framework implementation skill is selected.
- [ ] Semantic HTML and accessibility requirements are mapped.
- [ ] CSS selectors avoid classes and inline styles.
- [ ] Component/file tree follows `rule-mcp-styleguide-naming`.
- [ ] the `rulemcp://templates` resource is used where a template exists.
- [ ] `rule_tool_check` passes or reports known exceptions.

## See also

- [rule-mcp](../rule-mcp/SKILL.md) - Central skill and tool dispatcher
- [rule-mcp-ui-design-system](../rule-mcp-ui-design-system/SKILL.md) - Visual design direction
- [rule-mcp-frontend](../rule-mcp-frontend/SKILL.md) - Frontend framework routing
- [rule-mcp-styleguide](../rule-mcp-styleguide/SKILL.md) - Shared implementation standards
