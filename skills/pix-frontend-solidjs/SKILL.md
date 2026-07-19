---
name: rule-frontend-solidjs
description: >-
  Use when building SolidJS applications with fine-grained reactivity. Follows rule principles: zero CSS classes, semantic HTML, Signals, barrel file tree.
tags:
  - "frontend"
  - "solidjs"
frameworks: [solidjs]
---

# rule-frontend-solidjs — SolidJS with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
[rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) to **SolidJS** (fine-grained reactivity).

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** — only element selectors + `[data-part="..."]` + `[data-*]`
2. **Zero inline styles** — external `.css` files via `adoptedStyleSheets`
3. **Semantic HTML is mandatory** — never `<div>` where a semantic element exists
4. **Barrel pattern** — every component folder has `index.js`
5. **No CSS-in-JS, no Tailwind** — external `.css` files only

## File Tree Convention

```
src/
├── index.html
├── index.jsx                         ← Entry point (render)
├── components/
│   ├── TodoList/
│   │   ├── index.js                  ← Barrel
│   │   ├── _TodoList.jsx             ← Component (PascalCase + _ prefix)
│   │   ├── _TodoList.css             ← External CSS
│   │   └── __tests__/
│   └── TodoItem/
│       ├── index.js
│       ├── _TodoItem.jsx
│       ├── _TodoItem.css
│       └── __tests__/
└── stores/
    ├── index.js
    ├── _todoStore.js
    └── __tests__/
```

## Component Pattern

```jsx
// components/TodoItem/_TodoItem.jsx
import { onMount } from "solid-js";

const cssText = await (
  await fetch(new URL("./_TodoItem.css", import.meta.url))
).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function TodoItem(props) {
  onMount(() => {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });

  return (
    <article
      data-part="item"
      data-state-completed={props.todo.completed ? "done" : null}
    >
      <input
        type="checkbox"
        data-part="toggle"
        checked={props.todo.completed}
        onChange={() => props.onToggle?.(props.todo.id)}
      />
      <span data-part="title">{props.todo.title}</span>
      <button data-part="delete" onClick={() => props.onDelete?.(props.todo.id)}>
        Delete
      </button>
    </article>
  );
}
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

## SolidJS ↔ rule-frontend-vanilla-reactive Mapping

| rule-frontend-vanilla-reactive | SolidJS Equivalent |
|----------------------|--------------------|
| `StateSignal` | `createSignal()` |
| `ComputedSignal` | `createMemo()` |
| `effect()` | `createEffect()` |
| `Store (Proxy)` | `createStore()` (proxied) or plain signals |
| `tickState` bridge | Solid's fine-grained reactivity (automatic) |
| `html\`\`` tagged templates | JSX |
| `{{ expr \| filter }}` | `{expression}` |
| `${value}` | `{value}` |
| `@click=${fn}` | `onClick={fn}` |
| `model={...}` directive | `value` + `onInput` / `checked` + `onChange` |
| `<for each="x in xs">` | `<For each={items}>{(item) => <Component />}</For>` |
| `<if condition="c">` | `<Show when={c}>` / `<Switch>` / `<Match>` |
| `<switch expr="x">` | `<Switch><Match when={x === "a"}>...</Match></Switch>` |
| `adoptedStyleSheets` | `onMount` to adopt once |
| `data-part="..."` | `data-part="..."` (same) |

## CSS Loading Pattern

```jsx
// Module-level: fetch once
const cssText = await (
  await fetch(new URL("./_Component.css", import.meta.url))
).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function Component() {
  onMount(() => {
    // Adopt once
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
  // ...
}
```

## State Management — createStore

```js
// stores/_todoStore.js
import { createStore } from "solid-js/store";

export function createTodoStore() {
  const [todos, setTodos] = createStore([]);

  return {
    todos,
    addTodo(title) {
      setTodos([...todos, { id: crypto.randomUUID(), title, completed: false }]);
    },
    toggleTodo(id) {
      const idx = todos.findIndex((t) => t.id === id);
      if (idx >= 0) setTodos(idx, "completed", (c) => !c);
    },
  };
}
```

## Lists and Conditionals

```jsx
import { For, Show } from "solid-js";

function TodoList(props) {
  return (
    <section data-part="list">
      <Show
        when={props.todos.length > 0}
        fallback={<p data-part="empty">No todos yet.</p>}
      >
        <ul data-part="items">
          <For each={props.todos}>
            {(todo) => <li data-part="item">{todo.title}</li>}
          </For>
        </ul>
      </Show>
    </section>
  );
}
```

## Barrel Pattern

```js
// components/TodoItem/index.js
export { TodoItem } from "./_TodoItem.jsx";
```

---

## Reference

Load references/REFERENCE.md for detailed SolidJS patterns and API reference.
