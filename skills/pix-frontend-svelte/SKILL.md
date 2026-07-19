---
name: rule-frontend-svelte
description: >-
  Use when building Svelte 5 applications with runes API. Follows rule principles: zero CSS classes, semantic HTML, $state/$derived, barrel file tree.
tags:
  - "frontend"
  - "svelte"
frameworks: [svelte]
---

# rule-frontend-svelte — Svelte 5 with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
[rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) to **Svelte 5 runes API**.

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** — only element selectors + `[data-part="..."]` + `[data-*]`
2. **Zero inline styles** — CSS via `<style>` tag in `.svelte` (scoped by Svelte) or external `.css` imports
3. **Semantic HTML is mandatory** — never `<div>` where a semantic element exists
4. **Barrel pattern** — every component folder has `index.js`
5. **`<style>` is the primary mechanism** — Svelte scopes `<style>` tags per component. Use external CSS imports only for truly global styles.

## File Tree Convention

```
src/
├── index.html
├── main.js                          ← mount(App, target)
├── components/
│   ├── TodoList/
│   │   ├── index.js                 ← Barrel
│   │   ├── _TodoList.svelte         ← Svelte component (PascalCase + _ prefix)
│   │   ├── _TodoList.css            ← External CSS
│   │   └── __tests__/
│   └── TodoItem/
│       ├── index.js
│       ├── _TodoItem.svelte
│       ├── _TodoItem.css
│       └── __tests__/
└── stores/
    ├── index.js
    ├── _todos.svelte.js
    └── __tests__/
```

## Component Pattern

Use Svelte's native `<style>` tag for component-scoped CSS.
Svelte scopes styles to the component at compile time — no `adoptedStyleSheets` needed.

```svelte
<!-- components/TodoItem/_TodoItem.svelte -->
<script>
  let { todo, ontoggle, ondelete } = $props();
</script>

<article
  data-part="item"
  data-state-completed={todo.completed ? "done" : ""}
>
  <input
    type="checkbox"
    data-part="toggle"
    bind:checked={todo.completed}
    onchange={() => ontoggle?.(todo.id)}
  />
  <span data-part="title">{todo.title}</span>
  <button data-part="delete" onclick={() => ondelete?.(todo.id)}>
    Delete
  </button>
</article>

<style>
  article[data-part="item"] {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }
  article[data-part="item"][data-state-completed="done"] {
    opacity: 0.6;
  }
</style>
```

## CSS Loading in Svelte

Use the `<style>` tag inside `.svelte` files for component-scoped CSS.
Svelte automatically scopes styles at compile time — rule rules still apply:
no CSS classes, only element + `[data-part]` selectors.

For shared/global CSS, import at module level:

```svelte
<script>
  // Import global styles (applied globally, use sparingly)
  import "../styles/_base.css";
</script>
```

**No `adoptedStyleSheets` needed in Svelte** — the framework handles CSS scoping natively.

## Svelte ↔ rule-frontend-vanilla-reactive Mapping

| rule-frontend-vanilla-reactive | Svelte 5 Equivalent |
|----------------------|---------------------|
| `StateSignal` | `$state()` rune |
| `ComputedSignal` | `$derived()` rune |
| `effect()` | `$effect()` rune |
| `Store (Proxy)` | `$state()` object or Svelte store |
| `tickState` bridge | `$state()` deep reactivity (automatic) |
| `html\`\`` tagged templates | Template in `.svelte` file |
| `{{ expr \| filter }}` | `{expression}` + `$derived` |
| `${value}` | `{value}` |
| `@click=${fn}` | `onclick={fn}` |
| `model={...}` directive | `bind:value` / `bind:checked` |
| `<for each="x in xs">` | `{#each xs as x (x.id)}` |
| `<if condition="c">` | `{#if c}` |
| `<switch expr="x">` | `{#if}` / `{:else if}` chain |
| `adoptedStyleSheets` | `<style>` tag in `.svelte` (scoped by default) |

## Lists and Conditionals

```svelte
<section data-part="list">
  {#if todos.length > 0}
    <ul data-part="items">
      {#each todos as todo (todo.id)}
        <li data-part="item">{todo.title}</li>
      {/each}
    </ul>
  {:else}
    <p data-part="empty">No todos yet.</p>
  {/if}
</section>
```

## State Management — $state as Store

```js
// stores/_todos.svelte.js
let todos = $state([]);

export function getTodos() {
  return todos;
}

export function addTodo(title) {
  todos.push({ id: crypto.randomUUID(), title, completed: false });
}

export function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) todo.completed = !todo.completed;
}
```

## Barrel Pattern

```js
// components/TodoItem/index.js
export { default as TodoItem } from "./_TodoItem.svelte";
```

---

## Reference

Load references/REFERENCE.md for detailed Svelte patterns and API reference.
