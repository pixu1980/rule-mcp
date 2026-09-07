---
name: rule-frontend-solidjs
description: >-
  Use when building SolidJS applications with fine-grained reactivity. Follows rule principles: zero CSS classes, semantic HTML, Signals, barrel file tree.
tags:
  - "frontend"
  - "solidjs"
frameworks: [solidjs]
---

# rule-frontend-solidjs - SolidJS with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
a store-and-signals architecture to **SolidJS** (fine-grained reactivity).

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** - only element selectors + `[data-part="..."]` + `[data-*]`
2. **Zero inline styles** - external `.css` files via `adoptedStyleSheets`
3. **Flex first** - `display: grid` only for named areas, subgrid, explicit placement, or auto-fit tracks; anything a flex row or column can do is flex.
4. **Semantic HTML is mandatory** - never `<div>` where a semantic element exists
5. **Barrel pattern** - every component folder has `index.js`
6. **No CSS-in-JS, no Tailwind** - external `.css` files only

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

const cssText = await (await fetch(new URL("./_TodoItem.css", import.meta.url))).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function TodoItem(props) {
  onMount(() => {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });

  return (
    <article data-part="item" data-state-completed={props.todo.completed ? "done" : null}>
      <input type="checkbox" data-part="toggle" checked={props.todo.completed} onChange={() => props.onToggle?.(props.todo.id)} />
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

## SolidJS ↔ store-and-signals mapping

| Store and signals           | SolidJS Equivalent                                     |
| --------------------------- | ------------------------------------------------------ |
| `StateSignal`               | `createSignal()`                                       |
| `ComputedSignal`            | `createMemo()`                                         |
| `effect()`                  | `createEffect()`                                       |
| `Store (Proxy)`             | `createStore()` (proxied) or plain signals             |
| `tickState` bridge          | Solid's fine-grained reactivity (automatic)            |
| `html\`\`` tagged templates | JSX                                                    |
| `{{ expr \| filter }}`      | `{expression}`                                         |
| `${value}`                  | `{value}`                                              |
| `@click=${fn}`              | `onClick={fn}`                                         |
| `model={...}` directive     | `value` + `onInput` / `checked` + `onChange`           |
| `<for each="x in xs">`      | `<For each={items}>{(item) => <Component />}</For>`    |
| `<if condition="c">`        | `<Show when={c}>` / `<Switch>` / `<Match>`             |
| `<switch expr="x">`         | `<Switch><Match when={x === "a"}>...</Match></Switch>` |
| `adoptedStyleSheets`        | `onMount` to adopt once                                |
| `data-part="..."`           | `data-part="..."` (same)                               |

## CSS Loading Pattern

```jsx
// Module-level: fetch once
const cssText = await (await fetch(new URL("./_Component.css", import.meta.url))).text();
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

## State Management - createStore

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
      <Show when={props.todos.length > 0} fallback={<p data-part="empty">No todos yet.</p>}>
        <ul data-part="items">
          <For each={props.todos}>{(todo) => <li data-part="item">{todo.title}</li>}</For>
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

## Guardrails

Run `rule_tool_frontend_solidjs` mode=check or `rule_tool_check` to validate code against these rules.

Key rules enforced: **no-css-classes**, **no-inline-styles**, **semantic-html**,
**external-css** (adoptedStyleSheets or CSS imports), **barrel-file**, **data-part**,
**jsdoc-required** (every JS/TS file MUST have complete JSDoc - see rule-styleguide -> javascript.md),
**css-comments-required** (every CSS file MUST have file-level + section comments - see rule-styleguide -> css.md),
**a11y-test-required** (every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` - see rule-styleguide -> a11y.md -> Automated Testing).

## Project Scaffolding

All rule projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) -> Project Scaffolding.
Use `rule_tool_styleguide mode=scaffold` or `rule_tool_scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
`.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

Iterate: `generate → rule_tool_check → fix → rule_tool_check → all pass`.

---

## SolidJS Performance & Best Practices

This section extends rule-frontend-solidjs with a structured performance review methodology for SolidJS's fine-grained reactivity model.

### When to activate

- Review SolidJS component performance
- Refactor signal/store state logic
- Debug unexpected re-renders or missing reactivity
- Improve slow forms, lists, or large components
- Decide between `createSignal`, `createStore`, `createMemo`, `createResource`, `createEffect`
- Decide between SolidJS control flow components (`<For>`, `<Show>`, `<Switch>`) vs JSX array methods
- Write PR feedback about SolidJS code quality

### Operating principles

1. **SolidJS is fine-grained by default.** Signals update exactly what depends on them. The most common performance bugs come from **breaking the reactivity chain** (destructuring, accessing outside tracking scope, incorrect control flow).

2. **Prefer structural fixes before micro-optimizations.** Check signal ownership, reactive dependencies, and component boundaries before adding manual optimizations.

3. **Classify each issue** as: correctness bug, performance risk, maintainability risk, API design risk, premature optimization.

4. **Keep the smallest safe change first.**

### Review workflow

1. Identify the symptom (UI not updating, too much re-rendering, stale computed values, redundant work)
2. Find the owner (signal dependency, component boundary, effect cleanup, resource lifecycle)
3. Match to one of the 10 patterns below
4. Explain the risk
5. Propose smallest fix
6. End with a rule of thumb

### The 10 patterns

#### 1. Never destructure props - use `props.X` directly

Destructuring props breaks Solid's reactivity tracking.

```jsx
// ❌ Destructuring - breaks reactivity
function TodoItem({ todo, onToggle }) {
  return <span>{todo.title}</span>; // won't update
}

// ✅ Access props directly
function TodoItem(props) {
  return <span>{props.todo.title}</span>;
}

// ✅ Split props with pattern matching when needed
function TodoItem(props) {
  const local = mergeProps({ completed: false }, props);
  return <span>{local.todo.title}</span>;
}
```

Rule: _Access `props.X` directly. Destructuring severs the reactive chain._

#### 2. Use `<For>` for lists, not `.map()`

Solid's `<For>` component tracks identity via key and minimizes DOM operations.

```jsx
// ❌ Array.map - recreates all DOM on every signal change
<ul>{items().map(item => <li>{item.title}</li>)}</ul>

// ✅ <For> with stable key - minimal DOM operations
<ul>
  <For each={items()}>{(item) => <li>{item.title}</li>}</For>
</ul>
```

Rule: _Always use `<For>` with signal-derived arrays. Never use `.map()` on reactive data._

#### 3. Use `<Show>` and `<Switch>` for conditionals, not ternaries

Solid's control flow components preserve reactivity and properly clean up effects.

```jsx
// ❌ Ternary - effect cleanup may not work correctly
{
  cond() ? <Heavy /> : <Other />;
}

// ✅ <Show> - proper mount/unmount lifecycle
<Show when={cond()} fallback={<Other />}>
  <Heavy />
</Show>;
```

Rule: _Use `<Show>` for if/else, `<Switch>`/`<Match>` for multi-branch conditions._

#### 4. Use `createMemo` for derived computations

Do not recalculate expensive values inside JSX. Memoize them.

```jsx
// ❌ Expensive recalculation on every signal change
<p>Total: {items().reduce((s, i) => s + i.price, 0)}</p>;

// ✅ Memoized - recalculates only when items change
const total = createMemo(() => items().reduce((s, i) => s + i.price, 0));
<p>Total: {total()}</p>;
```

Rule: _`createMemo` for expensive or stable derived values. Simple values can stay inline._

#### 5. Use `createStore` for nested state, `createSignal` for flat values

`createSignal` is best for primitives and simple values. `createStore` provides deep reactive tracking for objects and arrays.

```js
// ✅ createSignal for primitives
const [count, setCount] = createSignal(0);

// ✅ createStore for nested objects/arrays
const [state, setState] = createStore({ items: [], user: null });

// ✅ Nested path updates
setState("items", 0, "completed", true);
```

Rule: _`createSignal` for flat values, `createStore` for deeply nested state._

#### 6. Use `createResource` for async data

`createResource` integrates async fetching with Suspense and proper lifecycle.

```jsx
const [userData, { mutate, refetch }] = createResource(
  () => props.userId,
  async (id) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  },
);

// Usage with Suspense
<Suspense fallback={<p>Loading...</p>}>
  <UserProfile data={userData()} />
</Suspense>;
```

Rule: _Use `createResource` for async data fetching. It integrates with Suspense and refetch._

#### 7. Keep signal state close to usage

Signals owned too high re-execute sibling effects on every change.

```jsx
// ❌ Signal in parent - whole tree re-runs on search
function App() {
  const [search, setSearch] = createSignal("");
  return (
    <>
      <SearchSection search={search} setSearch={setSearch} />
      <ExpensiveDashboard /> // re-runs unnecessarily
    </>
  );
}

// ✅ Signal in SearchSection - only it re-runs
function SearchSection() {
  const [search, setSearch] = createSignal("");
  return <>{/* search UI */}</>;
}
```

Rule: _Signals as close as possible to where they are read. Pass `props` not `accessors` when possible._

#### 8. Clean up side effects in `onCleanup`

Timers, event listeners, subscriptions, and manual resources must be cleaned up.

```jsx
import { onCleanup } from "solid-js";

createEffect(() => {
  const timer = setInterval(() => {
    console.log(props.id, "tick");
  }, 1000);

  onCleanup(() => clearInterval(timer)); // ✅ cleanup
});
```

Rule: _Every side effect in `createEffect` should pair with an `onCleanup`._

#### 9. Prefer `untrack` to read signals without tracking

When you need to read a signal inside an effect without creating a dependency, use `untrack()`.

```jsx
import { untrack } from "solid-js";

createEffect(() => {
  // Re-run when items() changes, but also read search() without subscribing to it
  saveToStorage(
    untrack(() => search()),
    items(),
  );
});
```

Rule: _`untrack()` reads without creating dependencies. Use it intentionally to break unnecessary effect re-runs._

#### 10. One responsibility = one reason to change

Split when data fetching, formatting, state transitions, and UI rendering change for different reasons.

```jsx
// ✅ Data hook
function useUserData(userId) {
  const [user] = createResource(userId, fetchUser);
  return user;
}

// ✅ View component
function UserProfile(props) {
  const user = useUserData(() => props.userId);
  return (
    <Show when={user()} fallback={<p>Loading...</p>}>
      <h1>{user().name}</h1>
    </Show>
  );
}
```

Rule: _Split when different changes affect different parts._

### Decision matrix

| Symptom                               | Check first         | Likely pattern              | Fix                         |
| ------------------------------------- | ------------------- | --------------------------- | --------------------------- |
| UI not updating after prop change     | Prop access         | Destructured props          | Access `props.X` directly   |
| List recreates all DOM on change      | List rendering      | `.map()` instead of `<For>` | Use `<For>` with stable key |
| Expensive calculation on every render | Derived value       | No createMemo               | Wrap in createMemo          |
| Deep nested state not reactive        | Store choice        | createSignal for object     | Use createStore             |
| Effect re-runs too often              | Dependency tracking | Untracked signal dependency | Add or use `untrack()`      |
| Memory leak on component unmount      | Cleanup             | Missing onCleanup           | Add onCleanup to effects    |
| Loading state not integrated          | Async data          | Manual fetch in effect      | Use createResource          |
| Sibling updates on input              | Signal ownership    | Signal too high             | Move signal down            |
| Large component is hard to maintain   | Responsibilities    | Mixed concerns              | Extract hooks + view        |
| Conditional component not cleaning up | Control flow        | Ternary instead of `<Show>` | Use `<Show>` / `<Switch>`   |

### Supporting resources

| Resource               | Path                                             |
| ---------------------- | ------------------------------------------------ |
| 10 detailed examples   | `examples/performance/01-*.md` ... `10-*.md`     |
| PR review checklist    | `checklists/solidjs-performance-pr-checklist.md` |
| Decision matrix        | `checklists/decision-matrix.md`                  |
| System prompt          | `prompts/portable-system-prompt.md`              |
| Code review prompt     | `prompts/code-review-prompt.md`                  |
| Refactor prompt        | `prompts/refactor-prompt.md`                     |
| Teaching prompt        | `prompts/teaching-prompt.md`                     |
| Audit report template  | `templates/audit-report-template.md`             |
| PR comment template    | `templates/pr-comment-template.md`               |
| Refactor plan template | `templates/refactor-plan-template.md`            |
| Performance playbook   | `knowledge/solidjs-performance-playbook.md`      |

---

## Forms (SolidJS)

### Prerequisites

- Use `@modular-forms/solid` + `zod` for all forms
- Signals for form state, effects for submission

### Step 1 - Define form with validation

```tsx
import { createForm, zodForm, SubmitHandler } from "@modular-forms/solid";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(255),
});

function MyForm() {
  const [form, { Form, Field }] = createForm({
    validate: zodForm(schema),
    initialValues: { email: "", name: "" },
  });

  const handleSubmit = async (values) => {
    // send data
  };

  return (
    <Form data-part="form" onSubmit={handleSubmit}>
      <Field name="email">
        {(field, props) => (
          <label data-part="field">
            <span data-part="label">Email</span>
            <input data-part="input" {...props} type="email" />
            {field.error && <span data-part="error">{field.error}</span>}
          </label>
        )}
      </Field>
      <button data-part="submit" disabled={form.submitting}>
        {form.submitting ? "Saving..." : "Save"}
      </button>
    </Form>
  );
}
```

### Checklist

- [ ] `@modular-forms/solid` + `zod` in use
- [ ] Schema validation covers full form
- [ ] Field-level errors rendered
- [ ] Submission guarded with `form.submitting`

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend skill index
- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared frontend standards
