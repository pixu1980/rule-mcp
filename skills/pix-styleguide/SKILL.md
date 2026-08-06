---
name: rule-styleguide
description: >-
  Style guides index — entry point for all coding style, conventions, best practices, guidelines, naming, and formatting rules.
  Use when the prompt mentions styleguides, coding standards, best practices, guidelines, conventions, or code formatting.
  Routes to the correct sub-skill based on topic: HTML semantics, CSS architecture, JS/TS conventions, JSON structure,
  Markdown formatting, naming/file-tree, accessibility (WCAG/a11y), or business validation.
tags:
  - "styleguide"
  - "index"
  - "html"
  - "css"
  - "javascript"
  - "a11y"
  - "naming"
  - "conventions"
  - "best-practices"
  - "guidelines"
  - "standards"
  - "formatting"
  - "code-style"
  - "code-quality"
  - "patterns"
frameworks: [all]
---

# rule-styleguide — Style Guides Index

This is the **umbrella index** for all coding style guides.
Use this as entry point for any prompt about coding style, conventions, best practices, or guidelines.

The `rule` routing tool uses this skill's description and tags to detect style-related queries.
Once routed here, consult the table below and load the specific sub-skill's SKILL.md for detailed rules.

---

## Available Guides

| Skill                                                              | Covers                                                                                         | When to use                             |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| [rule-styleguide-html](../rule-styleguide-html/SKILL.md)             | Semantic HTML, document structure, template engine syntax, valid nesting                       | Writing HTML templates or components    |
| [rule-styleguide-css](../rule-styleguide-css/SKILL.md)               | Data-part selectors, element selectors, cascade layers, custom properties, CSS comments        | Styling any component                   |
| [rule-styleguide-javascript](../rule-styleguide-javascript/SKILL.md) | Naming, functions, classes, async, JSDoc, Playwright + axe-core testing                        | Writing JS/TS modules                   |
| [rule-styleguide-json](../rule-styleguide-json/SKILL.md)             | Structure, property naming, date formats, numeric precision                                    | API contracts or config files           |
| [rule-styleguide-markdown](../rule-styleguide-markdown/SKILL.md)     | Headings, lists, code blocks, tables, links, tone                                              | Writing documentation                   |
| [rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md)             | WCAG 2.2 AA, ARIA, AI Behavioral Contract, Compliance Profiles, platform-native mapping        | Every PR — accessibility is mandatory   |
| [rule-styleguide-naming](../rule-styleguide-naming/SKILL.md)         | PascalCase, camelCase, UPPER_SNAKE_CASE, barrel pattern, `_` prefix, directory layout          | Creating new files, folders, or exports |
| [rule-styleguide-patterns](../rule-styleguide-patterns/SKILL.md)     | Quick reference cheat sheet: naming, file tree, HTML elements, CSS property order, JS patterns | Daily reference during development      |
| [rule-styleguide-validation](../rule-styleguide-validation/SKILL.md) | International business validation: email, phone, VAT, tax IDs, postal codes                    | Form/API validation rules               |

---

## How routing works

1. The `rule` tool receives your prompt and scores all skills by keyword matching
2. Generic queries ("style rules", "best practices", "guidelines", "conventions") match **this index** first
3. Topic-specific queries ("CSS selectors", "HTML semantics", "JS naming") match the **sub-skill** directly
4. Either way, the relevant sub-skill's SKILL.md is where the detailed rules live

**Example:** User says "CSS best practices" → router scores `rule-styleguide-css` highest → load its SKILL.md directly.
User says "what are the coding standards" → router scores `rule-styleguide` (this index) → then browse the table above.

---

## Shared Guardrails

Run `pix_check skill=rule-styleguide code="..."` to validate code.

Key guardrails enforced across all styleguides:

- **no-css-classes**: Zero `.class` selectors — use element + `[data-part]` only
- **no-inline-styles**: Zero `style="..."` attributes
- **semantic-html**: Zero `<div>` where semantic element exists
- **external-css**: CSS via `adoptedStyleSheets` or framework-native import
- **barrel-file-tree**: Every folder has `index.js` barrel
- **file-naming**: `_PascalCase.ext` for components
- **data-part-naming**: Child elements use `data-part="role"`
- **jsdoc-required**: JSDoc on every exported symbol
- **css-comments-required**: Comments on every CSS file
- **a11y-test-required**: Playwright + axe-core a11y tests

---

## See also

- [rule-toolchain-project](../rule-toolchain-project/SKILL.md) — Project config files (.gitignore, .editorconfig, etc.)
- [rule-ui-design-system](../rule-ui-design-system/SKILL.md) — Design system component patterns
- [rule](../rule/SKILL.md) — Central skill index
