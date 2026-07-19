---
name: rule-frontend-astro
description: >-
  Use when building Astro islands-architecture sites. Supports zero CSS classes, semantic HTML, partial hydration, and integration with UI frameworks.
tags:
  - "frontend"
  - "astro"
frameworks: [astro]
---

# rule-frontend-astro — Astro with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
[rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) to **Astro** (islands architecture).

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** — only element selectors + `[data-part="..."]` + `[data-*]`
2. **Zero inline styles** — external `.css` files via `adoptedStyleSheets` or `<style>` in `.astro`
3. **Semantic HTML is mandatory** — never `<div>` where a semantic element exists
4. **Barrel pattern** — every component folder has `index.js`
5. **Minimal client JS** — Astro islands with `client:load` / `client:idle` only where needed

## File Tree Convention

```
src/
├── pages/
│   ├── index.astro
│   └── settings.astro
├── components/
│   ├── TodoList/
│   │   ├── index.js                 ← Barrel
│   │   ├── _TodoList.astro          ← Astro component (.astro)
│   │   ├── _TodoList.css            ← External CSS
│   │   └── _TodoList.client.js      ← Client-side JS (island)
│   └── TodoItem/
│       ├── index.js
│       ├── _TodoItem.astro
│       ├── _TodoItem.css
│       └── _TodoItem.client.js      ← Client island
├── layouts/
│   ├── _BaseLayout.astro
│   └── _BaseLayout.css
└── styles/
    ├── index.css
    ├── _base.css
    └── _tokens.css
```

## Component Pattern (.astro)

```astro
---
// components/TodoList/_TodoList.astro
import { TodoItem } from "../TodoItem/index.js";
import "./_TodoList.css";

export interface Props {
  todos: Array<{ id: string; title: string; completed: boolean }>;
}

const { todos } = Astro.props;
---
<section data-part="list">
  <header data-part="header">
    <h2 data-part="title">Todos</h2>
  </header>
  {todos.length > 0 ? (
    <ul data-part="items">
      {todos.map((todo) => (
        <li data-part="item">
          <TodoItem todo={todo} />
        </li>
      ))}
    </ul>
  ) : (
    <p data-part="empty">No todos yet.</p>
  )}
</section>
```

```css
/* components/TodoList/_TodoList.css */
section[data-part="list"] {
  padding: 1rem;
}
header[data-part="header"] {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
```

## Client Island Pattern

For interactive components, extract client JS into a separate file
and load it via `client:load`:

```astro
---
// _InteractiveTodoItem.astro
import "./_InteractiveTodoItem.css";
---
<li data-part="item" class="todo-item-wrapper">
  <span data-part="title">{todo.title}</span>
  <button data-part="delete">Delete</button>
</li>

<script src="./_InteractiveTodoItem.client.js"></script>
```

```js
// _InteractiveTodoItem.client.js
// Vanilla JS — no React/Vue needed for simple interactions
document.querySelectorAll("[data-part='delete']").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest("[data-part='item']");
    item?.remove();
  });
});
```

## Astro ↔ rule-frontend-vanilla-reactive Mapping

| rule-frontend-vanilla-reactive | Astro Equivalent |
|----------------------|------------------|
| `html\`\`` tagged templates | `.astro` template (JSX-like) |
| `{{ expr }}` | `{expression}` |
| `@click=${fn}` | Client island JS or framework island |
| `adoptedStyleSheets` | `<style>` in `.astro` (scoped by default) or external CSS import |
| `data-part="..."` | `data-part="..."` (same) |
| Component folder | `components/PascalCase/` |
| Barrel | `index.js` in component folder |

## CSS in Astro

Astro `<style>` tags are **scoped by default** — this is acceptable.
For shared styles, use `adoptedStyleSheets` or `@import` in a global stylesheet.

```astro
---
// Load external CSS (runs once at build time)
import "./_Component.css";
---
<!-- component markup -->

<!-- Also acceptable: scoped <style> for component-specific rules -->
<style>
  [data-part="item"] {
    border-bottom: 1px solid var(--color-border);
  }
</style>
```

## Barrel Pattern

```js
// components/TodoItem/index.js
export { default as TodoItem } from "./_TodoItem.astro";
```

---

## Guardrails

Run `pix_frontend_astro` mode=check or `pix_check` to validate code against these rules.

Key rules enforced: **no-css-classes**, **no-inline-styles**, **semantic-html**,
**external-css** (Astro `<style>` scoped blocks or external CSS imports),
**barrel-file**, **data-part**,
**jsdoc-required** (every JS/TS file MUST have complete JSDoc — see rule-styleguide → javascript.md),
**css-comments-required** (every CSS file MUST have file-level + section comments — see rule-styleguide → css.md),
**a11y-test-required** (every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` — see rule-styleguide → a11y.md → Automated Testing).

## Reference

Load references/REFERENCE.md for detailed Astro patterns and examples.
