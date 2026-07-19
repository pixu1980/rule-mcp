---
name: rule-frontend-react
description: >-
  Use when building React 18+ functional components. Follows rule principles: zero CSS classes, semantic HTML, barrel file tree, data-part selectors.
tags:
  - "frontend"
  - "react"
frameworks: [react]
---

# rule-frontend-react — React with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) (file tree, naming, CSS, HTML)
and [rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) (component architecture, patterns)
to **React 18+ functional components with hooks**.

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** — only element selectors + `[data-part="..."]` + `[data-*]` attribute selectors
2. **Zero inline styles** — all styling in external `.css` files via `adoptedStyleSheets`
3. **Semantic HTML is mandatory** — never `<div>` where `<section>`, `<article>`, `<header>`, `<footer>`, `<nav>`, `<main>`, `<aside>`, `<form>`, `<ul>`, `<ol>`, `<li>`, `<search>` exists
4. **Barrel pattern** — every component folder has `index.js` re-export, files are `_PascalCase.ext`
5. **No CSS-in-JS, no CSS Modules, no Tailwind** — external `.css` files only

## File Tree Convention

```
src/
├── index.html
├── index.jsx                        ← Entry point
├── components/
│   ├── TodoList/
│   │   ├── index.js                 ← Barrel
│   │   ├── _TodoList.jsx            ← Component (PascalCase + _ prefix)
│   │   ├── _TodoList.css            ← External CSS (co-located)
│   │   ├── _TodoList.consts.js      ← Constants (optional)
│   │   └── __tests__/
│   │       └── _TodoList.test.jsx
│   └── TodoItem/
│       ├── index.js
│       ├── _TodoItem.jsx
│       ├── _TodoItem.css
│       └── __tests__/
└── helpers/
    ├── index.js
    ├── _formatDate.js
    └── __tests__/
```

- Component folders: `PascalCase/`
- Non-component folders: `kebab-case/`
- Non-index files: `_PascalCase.ext` (components), `_kebab-case.ext` (utilities)
- Barrel: `index.js` in every folder

## Component Pattern

```jsx
// components/TodoItem/_TodoItem.jsx
import { useEffect, useRef } from "react";

const cssText = await (
  await fetch(new URL("./_TodoItem.css", import.meta.url))
).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function TodoItem({ todo, onToggle, onDelete }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  return (
    <article ref={ref} data-part="item" data-state-completed={todo.completed ? "done" : null}>
      <input
        type="checkbox"
        data-part="toggle"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span data-part="title">{todo.title}</span>
      <button data-part="delete" onClick={() => onDelete(todo.id)}>
        Delete
      </button>
    </article>
  );
}
```

```css
/* components/TodoItem/_TodoItem.css — NO classes */
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
[data-part="toggle"] {
  accent-color: var(--color-accent);
}
button[data-part="delete"] {
  background: var(--color-danger);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}
```

### Barrel

```js
// components/TodoItem/index.js
export { TodoItem } from "./_TodoItem.jsx";
```

## React ↔ rule-frontend-vanilla-reactive Mapping

| rule-frontend-vanilla-reactive | React Equivalent |
|----------------------|-----------------|
| `StateSignal` | `useState` / `useReducer` |
| `ComputedSignal` | `useMemo` |
| `effect()` | `useEffect` |
| `Store (Proxy)` | React Context + `useReducer` |
| `tickState` bridge | Context dispatch |
| `html\`\`` tagged templates | JSX |
| `{{ expr \| filter }}` | `{expression}` inline |
| `${value}` | `{value}` |
| `@click=${fn}` | `onClick={fn}` |
| `model={...}` directive | `value` + `onChange` |
| `<for each="x in xs">` | `{xs.map(x => <Component key={x.id} />)}` |
| `<if condition="c">` | `{c && <Content />}` or ternary |
| `<switch expr="x">` | `{switch(x) { ... }}` or object map |
| `adoptedStyleSheets` | `useEffect` to adopt once |
| `data-part="..."` | `data-part="..."` (same) |
| `static {}` block | Module-level CSS fetch |

## CSS Loading Pattern

Always load CSS as an external file, convert to `CSSStyleSheet`, adopt once.

```jsx
// Module-level: fetch + create sheet (runs once per import)
const cssText = await (await fetch(new URL("./_Component.css", import.meta.url))).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

// In component: adopt on mount (once per element)
useEffect(() => {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}, []);
```

## State Management (Store → Context)

```jsx
// helpers/_AppContext.jsx
import { createContext, useContext, useReducer } from "react";

const AppContext = createContext(null);
const AppDispatch = createContext(null);

export function AppProvider({ children, initialState, reducer }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={state}>
      <AppDispatch.Provider value={dispatch}>
        {children}
      </AppDispatch.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}

export function useAppDispatch() {
  return useContext(AppDispatch);
}
```

## Rendering Lists

```jsx
// ❌ NO: className, <div> for items
<ul data-part="list">
  {todos.map((todo) => (
    <li key={todo.id} data-part="item">
      <TodoItem todo={todo} />
    </li>
  ))}
</ul>
```

## Conditional Rendering

```jsx
// ✅ Use: ternary, &&, or early return
{hasTodos ? (
  <ul data-part="list">
    {todos.map((t) => <li key={t.id} data-part="item">{t.title}</li>)}
  </ul>
) : (
  <p data-part="empty">No todos yet.</p>
)}
```

## Complete Example: TodoApp

See the full working example in `examples/react/` of the rule-frontend-react skill directory,
or refer to rule-frontend-vanilla-reactive Section 14 (Hello World) adapted to JSX syntax.

---

## Guardrails

Run `pix_frontend_react` mode=check or `pix_check` to validate code against these rules.

Key rules enforced: **no-css-classes**, **no-inline-styles**, **semantic-html**,
**external-css** (CSS Modules or adoptedStyleSheets), **barrel-file**, **data-part**,
**react-no-classname** (no `className`, use `data-part`), **react-hooks-rules**
(hooks at top level),
**jsdoc-required** (every JS/TS file MUST have complete JSDoc — see rule-styleguide → javascript.md),
**css-comments-required** (every CSS file MUST have file-level + section comments — see rule-styleguide → css.md),
**a11y-test-required** (every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` — see rule-styleguide → a11y.md → Automated Testing).

## Project Scaffolding

All rule projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) → Project Scaffolding.
Use `pix_styleguide mode=scaffold` or `pix_scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
`.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

Iterate: `generate → pix_check → fix → pix_check → all pass`.

---

## Reference

Load references/REFERENCE.md for React performance optimization, quality gates, forms, and step-by-step project setup.
