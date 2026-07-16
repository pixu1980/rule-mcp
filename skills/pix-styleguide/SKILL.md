---
name: pix-styleguide
description: >-
  Use when enforcing coding style to route to the correct styleguide skill. Covers HTML semantics, CSS architecture, JavaScript conventions, naming, and a11y.
tags:
  - "styleguide"
  - "index"
  - "html"
  - "css"
  - "javascript"
  - "a11y"
  - "naming"
  - "conventions"
frameworks: [all]
---

# pix-styleguide — Style Guides Index

This is the umbrella index for all coding style guides.
Each guide lives in its own dedicated skill below.

## Available Guides

| Skill | Covers | Use When |
|-------|--------|----------|
| [pix-styleguide-html](../pix-styleguide-html/SKILL.md) | Semantic HTML, document structure, template syntax | Writing HTML templates or components |
| [pix-styleguide-css](../pix-styleguide-css/SKILL.md) | Data-part selectors, custom properties, cascade layers | Styling any component |
| [pix-styleguide-javascript](../pix-styleguide-javascript/SKILL.md) | Naming, functions, classes, async, imports | Writing JS/TS modules |
| [pix-styleguide-json](../pix-styleguide-json/SKILL.md) | Structure, property naming, date formats | Defining API contracts or configs |
| [pix-styleguide-markdown](../pix-styleguide-markdown/SKILL.md) | Headings, lists, code blocks, formatting | Writing documentation |
| [pix-styleguide-a11y](../pix-styleguide-a11y/SKILL.md) | WCAG 2.2 AA, ARIA, Playwright + axe-core | Every PR — mandatory |
| [pix-styleguide-naming](../pix-styleguide-naming/SKILL.md) | PascalCase, barrel pattern, underscore prefix | Creating new files or folders |
| [pix-styleguide-patterns](../pix-styleguide-patterns/SKILL.md) | Quick reference cheat sheet | Daily reference during development |
| [pix-styleguide-validation](../pix-styleguide-validation/SKILL.md) | International business validation | Form/API validation rules |

## Guardrails

Run `pix_check skill=pix-styleguide code="..."` to validate code.

Key shared guardrails enforced across all styleguides:
- **no-css-classes**: Zero `.class` selectors — use element + `[data-part]` only
- **no-inline-styles**: Zero `style="..."` attributes
- **semantic-html**: Zero `<div>` where semantic element exists
- **external-css**: CSS via `adoptedStyleSheets` or framework-native import
- **barrel-file-tree**: Every folder has `index.js` barrel
- **file-naming**: `_PascalCase.ext` for components
- **data-part-naming**: Child elements use `data-part="role"`
- **jsdoc-required**: JSDoc on every exported symbol
- **a11y-test-required**: Playwright + axe-core a11y tests

## See also

- [pix-styleguide-validation](../pix-styleguide-validation/SKILL.md) — Business validation
- [pix-toolchain-project](../pix-toolchain-project/SKILL.md) — Project config files
- [pix](../pix/SKILL.md) — Central skill index
