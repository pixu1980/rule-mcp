---
name: rule-styleguide
description: >-
  Style guides index - entry point for all coding style, conventions, best practices, guidelines, naming, and formatting rules.
  Use when the prompt mentions styleguides, coding standards, best practices, guidelines, conventions, or code formatting.
  Routes to the correct sub-skill based on topic: HTML semantics, CSS architecture, JS/TS conventions, JSON structure,
  Markdown formatting, naming/file-tree, accessibility (WCAG/a11y), internationalization (i18n/l10n), or business validation.
tags:
  - "styleguide"
  - "index"
  - "html"
  - "css"
  - "javascript"
  - "a11y"
  - "i18n"
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

# rule-styleguide - Style Guides Index

This is the **umbrella index** for all coding style guides.
Use this as entry point for any prompt about coding style, conventions, best practices, or guidelines.

The `rule` routing tool uses this skill's description and tags to detect style-related queries.
Once routed here, consult the table below and load the specific sub-skill's SKILL.md for detailed rules.

---

## Available Guides

| Skill                                                                | Covers                                                                                                       | When to use                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [rule-styleguide-html](../rule-styleguide-html/SKILL.md)               | The mandatory document boilerplate, semantic HTML, document structure, template engine syntax, valid nesting | Any page, and every HTML template or component     |
| [rule-styleguide-css](../rule-styleguide-css/SKILL.md)                 | Data-part selectors, element selectors, cascade layers, custom properties, CSS comments                      | Styling any component                              |
| [rule-styleguide-configuration](../rule-styleguide-configuration/SKILL.md) | Base project config files: .gitignore, .editorconfig, .nvmrc, .env.example, README, LICENSE, CONTRIBUTING | Setting up or auditing a repository                |
| [rule-styleguide-git](../rule-styleguide-git/SKILL.md)                     | Atomic Conventional Commits with a mandatory scope, branch naming, commit-msg and pre-push discipline      | Writing, validating or preparing git commits       |
| [rule-styleguide-javascript](../rule-styleguide-javascript/SKILL.md)   | Naming, functions, classes, async, JSDoc, Playwright + axe-core testing                                      | Writing JS/TS modules                              |
| [rule-styleguide-json](../rule-styleguide-json/SKILL.md)               | Structure, property naming, date formats, numeric precision                                                  | API contracts or config files                      |
| [rule-styleguide-fingerprint](../rule-styleguide-fingerprint/SKILL.md) | ASCII punctuation, American English, phrasing tells                                                          | Writing any prose a reader will see                |
| [rule-styleguide-baseline](../rule-styleguide-baseline/SKILL.md)       | The three support states, what a fallback costs, `@supports`, the project's support floor                    | Deciding whether a platform feature is safe to use |
| [rule-styleguide-markdown](../rule-styleguide-markdown/SKILL.md)       | Headings, lists, code blocks, tables, links, tone                                                            | Writing documentation                              |
| [rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md)               | WCAG 2.2 AA, ARIA, AI Behavioral Contract, Compliance Profiles, platform-native mapping                      | Every PR - accessibility is mandatory              |
| [rule-styleguide-i18n](../rule-styleguide-i18n/SKILL.md)               | Translation keys, plurals, `Intl` dates/numbers/currencies, RTL layout, pseudo-localization                  | Shipping in more than one language or region       |
| [rule-styleguide-naming](../rule-styleguide-naming/SKILL.md)           | PascalCase, camelCase, UPPER_SNAKE_CASE, barrel pattern, `_` prefix, directory layout                        | Creating new files, folders, or exports            |
| [rule-styleguide-patterns](../rule-styleguide-patterns/SKILL.md)       | Quick reference cheat sheet: naming, file tree, HTML elements, CSS property order, JS patterns               | Daily reference during development                 |
| [rule-styleguide-typescript](../rule-styleguide-typescript/SKILL.md)   | any vs unknown, type guards, unions over enum, generics, never, readonly                                     | Writing or reviewing TypeScript                    |

---

## How routing works

1. The `rule` tool receives your prompt and scores all skills by keyword matching
2. Generic queries ("style rules", "best practices", "guidelines", "conventions") match **this index** first
3. Topic-specific queries ("CSS selectors", "HTML semantics", "JS naming") match the **sub-skill** directly
4. Either way, the relevant sub-skill's SKILL.md is where the detailed rules live

**Example:** User says "CSS best practices" -> router scores `rule-styleguide-css` highest -> load its SKILL.md directly.
User says "what are the coding standards" -> router scores `rule-styleguide` (this index) -> then browse the table above.

---

## Shared Guardrails

Run `rule_tool_check skill=rule-styleguide code="..."` to validate code.

Key guardrails enforced across all styleguides:

- **no-css-classes**: Zero `.class` selectors - use element + `[data-part]` only
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

- [rule-styleguide-configuration](../rule-styleguide-configuration/SKILL.md) - Project config files (.gitignore, .editorconfig, etc.)
- [rule-ui-design-system](../rule-ui-design-system/SKILL.md) - Design system component patterns
- [rule](../rule/SKILL.md) - Central skill index

---

## Project Scaffolding

The config files every rule project starts with. `rule_tool_styleguide
mode=scaffold file=<name>` returns one, `mode=scaffold` returns all of them, and
`rule_tool_check` with `rule-styleguide` verifies what a project actually has. Each block
below is the file, verbatim - the checker reads these same rules, so a template
that drifts from its guardrail fails the suite.

### `.prettierrc`

```json
{
  "printWidth": 120,
  "tabWidth": 2,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### `.nvmrc`

```text
lts/*
```

One line, no version number. A pinned major goes stale in a repository nobody
revisits, and `lts/*` is the version the toolchain is tested against.

### `.npmrc`

```ini
# Exact versions, always. A caret does not pin what it names and it does not pin
# what that depends on: two installs of the same commit resolve different
# subdependency trees. Guardrail pkg-exact-versions checks the result; this is
# what stops `pnpm add` from writing a range in the first place.
save-exact=true
```

### `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

### `.gitignore`

```text
# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
build/
coverage/

# Environment
.env
.env.local

# Editors and OS
.DS_Store
Thumbs.db
.idea/
*.swp
```

### `eslint.config.mjs`

```javascript
import js from "@eslint/js";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  unicorn.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-console": "off",
      "prefer-const": "error",
      "unicorn/prevent-abbreviations": "off",
    },
  },
  {
    ignores: ["dist/", "build/", "coverage/", "node_modules/"],
  },
]);
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### `jsconfig.json`

```json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Use `tsconfig.json` in a TypeScript project and `jsconfig.json` in a JavaScript
one. Both, and the editor picks whichever it finds first.
