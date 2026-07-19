---
name: rule-frontend-vue
description: >-
  Use when building Vue 3 Composition API components. Follows rule principles: zero CSS classes, semantic HTML, barrel file tree, data-part selectors.
tags:
  - "frontend"
  - "vue"
frameworks: [vue]
---

# rule-frontend-vue — Vue 3 with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
[rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) to **Vue 3 Composition API**.

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** — only element selectors + `[data-part="..."]` + `[data-*]` attribute selectors
2. **Zero inline styles** — all styling in external `.css` files via `adoptedStyleSheets`
3. **Semantic HTML is mandatory** — never `<div>` where a semantic element exists
4. **Barrel pattern** — every component folder has `index.js`
5. **No scoped `<style>` blocks** — external `.css` files only, loaded at module scope
6. **No utility CSS frameworks** (Tailwind, UnoCSS, etc.)

## File Tree Convention

```
src/
├── index.html
├── main.js                          ← Entry point (createApp)
├── components/
│   ├── TodoList/
│   │   ├── index.js                 ← Barrel
│   │   ├── _TodoList.vue            ← SFC (PascalCase + _ prefix)
│   │   ├── _TodoList.css            ← External CSS
│   │   └── __tests__/
│   └── TodoItem/
│       ├── index.js
│       ├── _TodoItem.vue
│       ├── _TodoItem.css
│       └── __tests__/
└── composables/
    ├── index.js
    ├── _useTodos.js
    └── __tests__/
```

## Component Pattern (SFC with external CSS)

```vue
<!-- components/TodoItem/_TodoItem.vue -->
<script setup>
import { onMounted } from "vue";

const cssText = await (
  await fetch(new URL("./_TodoItem.css", import.meta.url))
).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

onMounted(() => {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
});

defineProps({
  todo: { type: Object, required: true },
  onToggle: { type: Function },
  onDelete: { type: Function },
});
</script>

<template>
  <article
    data-part="item"
    :data-state-completed="todo.completed ? 'done' : null"
  >
    <input
      type="checkbox"
      data-part="toggle"
      :checked="todo.completed"
      @change="$emit('toggle', todo.id)"
    />
    <span data-part="title">{{ todo.title }}</span>
    <button data-part="delete" @click="$emit('delete', todo.id)">
      Delete
    </button>
  </article>
</template>
```

```css
/* components/TodoItem/_TodoItem.css */
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
```

## Vue ↔ rule-frontend-vanilla-reactive Mapping

| rule-frontend-vanilla-reactive | Vue 3 Equivalent |
|----------------------|------------------|
| `StateSignal` | `ref()` / `reactive()` |
| `ComputedSignal` | `computed()` |
| `effect()` | `watchEffect()` / `watch()` |
| `Store (Proxy)` | `reactive()` or Pinia store |
| `tickState` bridge | Deep reactivity (automatic) |
| `html\`\`` tagged templates | `<template>` block |
| `{{ expr \| filter }}` | `{{ expr }}` + computed / methods |
| `${value}` | `{{ value }}` |
| `@click=${fn}` | `@click="fn"` |
| `model={...}` directive | `v-model` |
| `<for each="x in xs">` | `v-for="x in xs" :key="x.id"` |
| `<if condition="c">` | `v-if="c"` |
| `<switch expr="x">` | `v-if / v-else-if / v-else` chain |
| `adoptedStyleSheets` | `onMounted` to adopt once |
| `data-part="..."` | `:data-part="..."` (Vue binding) |

## CSS Loading — Module Scope

Always load CSS at module scope (outside `<script setup>`), not in `<style>` blocks.

```vue
<script setup>
// Module-scope: runs once per import
const cssText = await (
  await fetch(new URL("./_Component.css", import.meta.url))
).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

onMounted(() => {
  // Adopt once per mount (idempotent via Set)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
});
</script>

<template>...</template>
<!-- NO <style> block — use external .css file -->
```

## Lists and Conditionals

```vue
<template>
  <section data-part="list">
    <ul v-if="todos.length" data-part="items">
      <li v-for="todo in todos" :key="todo.id" data-part="item">
        {{ todo.title }}
      </li>
    </ul>
    <p v-else data-part="empty">No todos yet.</p>
  </section>
</template>
```

## State Management (Store → reactive)

```js
// composables/_useAppStore.js
import { reactive } from "vue";

const state = reactive({
  todos: [],
  filter: "all",
});

export function useAppStore() {
  function addTodo(title) {
    state.todos.push({ id: crypto.randomUUID(), title, completed: false });
  }
  function toggleTodo(id) {
    const todo = state.todos.find((t) => t.id === id);
    if (todo) todo.completed = !todo.completed;
  }
  return { state, addTodo, toggleTodo };
}
```

## Barrel Pattern

```js
// components/TodoItem/index.js
export { default as TodoItem } from "./_TodoItem.vue";
```

---

## Reference

Load references/REFERENCE.md for detailed Vue patterns and API reference.
