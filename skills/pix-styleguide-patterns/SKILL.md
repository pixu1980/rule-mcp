---
name: rule-styleguide-patterns
description: >-
  Use as a quick reference for rule naming and property conventions. Covers condensed cheat sheet for naming, property ordering, and file tree structure.
tags:
  - "patterns"
  - "reference"
  - "cheatsheet"
  - "quickref"
frameworks: [all]
---

# rule-styleguide - Pattern Quick Reference

## Naming Quick Reference

```
┌────────────────────────────────────────────────────┐
│   PASCAL CASE                                      │
│   ├── Class names          class TodoItem          │
│   ├── Functional components  function TodoItem()   │
│   ├── Component folders     components/TodoItem/   │
│   ├── Component files       _TodoItem.js           │
│                                                    │
│   CAMEL CASE                                       │
│   ├── Variables             const userName = ''    │
│   ├── Functions             function fetchData()   │
│   ├── Properties            obj.firstName          │
│                                                    │
│   UPPER_SNAKE_CASE                                 │
│   ├── Constants (all)       const MAX_RETRIES = 3  │
│                                                    │
│   kebab-case                                       │
│   ├── Custom element tags   'todo-item'            │
│   ├── Generic files         api-client.js          │
│   ├── Non-component folders  helpers/  core/       │
│   ├── CSS custom props     --color-primary-500     │
│                                                    │
│   _ PREFIX                                         │
│   ├── Non-index files       _TodoItem.js           │
│   ├── Test files            _TodoItem.test.js      │
│                                                    │
│   INDEX                                            │
│   ├── Barrel export         index.js               │
│   ├── Entry point HTML      index.html             │
│   └── CSS barrel            index.css              │
└────────────────────────────────────────────────────┘
```

## File Tree Convention

```
src/
├── index.html
├── index.js
├── components/           ← PascalCase
│   ├── TodoList/
│   │   ├── index.js            ← barrel, NO _
│   │   ├── _TodoList.js
│   │   ├── _TodoList.css
│   │   ├── _TodoList.consts.js
│   │   └── __tests__/
│   │       └── _TodoList.test.js
│   └── TodoItem/              ← sibling di TodoList
│       ├── index.js
│       ├── _TodoItem.js
│       └── _TodoItem.css
├── helpers/              ← kebab-case
│   ├── index.js
│   ├── _addTodo.js
│   └── __tests__/
│       └── _addTodo.test.js
├── core/                 ← kebab-case
│   ├── index.js
│   ├── _signal.js
│   └── _store.js
└── styles/               ← kebab-case
    ├── index.css
    ├── _base.css
    └── _components.css
```

## HTML - Semantic Elements Cheat Sheet (MANDATORY)

| Instead of `<div>`             | Use                         |
| ------------------------------ | --------------------------- |
| Generic container with heading | `<section>`                 |
| Self-contained content         | `<article>`                 |
| Top navigation links           | `<nav>`                     |
| Main page content              | `<main>`                    |
| Site/page header               | `<header>`                  |
| Section/component header       | `<header>`                  |
| Site/page footer               | `<footer>`                  |
| Section/component footer       | `<footer>`                  |
| Sidebar, complementary         | `<aside>`                   |
| Image + caption                | `<figure>` + `<figcaption>` |
| Clickable action               | `<button>`                  |
| List of items                  | `<ul>` / `<ol>` + `<li>`    |
| Search bar                     | `<search>`                  |
| Form                           | `<form>`                    |
| Tab navigation                 | `<nav>`                     |
| Summary/stats                  | `<section>`                 |
| Modal/dialog                   | `<dialog>`                  |
| Expandable section             | `<details>` + `<summary>`   |
| Flex row / CSS wrapper         | `<section>`                 |

## CSS - Property Ordering

1. Custom properties
2. Positioning (`position`, `inset`, `z-index`)
3. Layout (`display`, `flex`, `grid`, `gap`)
4. Visibility (`opacity`, `visibility`)
5. Box model (`width`, `padding`, `border`, `margin`, `outline`)
6. Colors + backgrounds
7. Typography
8. Transforms + motion
9. Behavior (`cursor`, `appearance`)

### Selector Rules

- **NO CSS classes** - use only element + attribute selectors
- Scope children under the custom element tag
- Use `data-part="name"` for child element identification
- Use `data-*` attributes for state (boolean presence)

```css
my-component {
  display: block;
} /* ✅ element */
my-component [data-part="header"] {
} /* ✅ attribute */
my-component [data-open] {
} /* ✅ state attribute */
.my-component {
  display: block;
} /* ❌ class */
```

## JavaScript - Static Init Block Pattern

```js
import styles from "./_MyComponent.css" with { type: "css" };

class MyComponent extends HTMLElement {
  static {
    customElements.define("my-component", this);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles];
  }
  connectedCallback() {
    this.render();
  }
  render() {
    /* idempotent DOM rendering */
  }
}
```

## JavaScript - Modern Idioms (unicorn-enforced)

| Instead of                         | Use                           | Why                                          |
| ---------------------------------- | ----------------------------- | -------------------------------------------- |
| `arr.includes(x)` in a loop        | `new Set(arr).has(x)`         | O(1) vs O(n) per lookup (O(n²) in loops)     |
| `arr.forEach(fn)`                  | `for (const item of arr) { }` | break/continue/await + TS narrowing          |
| `import fs from 'fs'`              | `import fs from 'node:fs'`    | unshadowable builtin                         |
| `throw Error('boom')`              | `throw new Error('boom')`     | `new` required                               |
| `str.replace(/-/g, ' ')`           | `str.replaceAll('-', ' ')`    | clearer intent                               |
| `rows.map(f).flat()`               | `rows.flatMap(f)`             | no intermediate array                        |
| `const m = Map()`                  | `const m = new Map()`         | `new` for Map/Set/Date/Array/WeakMap/WeakSet |
| `if (ok) return a; else return b;` | `return ok ? a : b;`          | avoids `let`, enables `prefer-const`         |

## Import Order

1. Core / framework
2. Components
3. Helpers / utilities
4. Styles
5. Side-effect (registrations)

```js
import { Store } from "@core/index.js";
import { TodoItem } from "@components/TodoItem/index.js";
import { addTodo } from "@helpers/index.js";
import "@styles/index.css";
```

## Accessibility - Minimum Viable Checklist

- [ ] No `<div>` anywhere - use `<section>` for flex wrappers, `<dialog>` for modals
- [ ] One `<h1>`, no skipped heading levels
- [ ] Every `<input>` has `<label for="id">`
- [ ] All images have `alt` (or `alt=""`)
- [ ] Focus styles visible (never `outline: none`)
- [ ] Color contrast ≥ 4.5:1 for text
- [ ] No color-only information
- [ ] Keyboard navigation works
- [ ] `lang` attribute on `<html>`
- [ ] `prefers-reduced-motion` respected

---

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) - Style guides index
- [rule](../rule/SKILL.md) - Central skill index
