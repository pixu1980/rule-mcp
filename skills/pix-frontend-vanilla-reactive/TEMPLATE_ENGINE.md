# pix-vanilla-reactive — Template Engine Capabilities (v2)

> Reference: `skills/pix-frontend-vanilla-reactive/examples/src/core/`
> Living document — update as the engine evolves.

---

## 1. Data Interpolation

| Syntax | Type | Escaped | Example |
|--------|------|---------|---------|
| `{{ expr }}` | data | ✅ | `<h1>{{ title }}</h1>` |
| `{{ expr \| raw }}` | data | ❌ | `<div>{{ htmlContent \| raw }}</div>` |

### Expression examples

| Expression | Description |
|------------|-------------|
| `{{ title }}` | Simple variable lookup |
| `{{ title \| upper }}` | Variable + filter |
| `{{ title \| truncate:20 }}` | Filter with argument |
| `{{ title \| slugify \| upper }}` | Filter chain |
| `{{ items \| length }}` | Array/string length |
| `{{ items \| join:', ' }}` | Array to string |
| `{{ date \| timeAgo }}` | Relative time |
| `{{ date \| date:'YYYY-MM-DD' }}` | Date formatting |

### Built-in filters (18)

```
upper, lower, capitalize, slugify, slug, trim,
escapeHtml, striptags, raw, json, default,
truncate, length, first, last, join,
tagLabel, tagHref, date, timeAgo, urlencode, sortBy
```

---

## 2. Expression Parsing (inside `{{ }}`)

| Form | Example | Resolves to |
|------|---------|-------------|
| Dot-path variable | `{{ todo.title }}` | `ctx.todo.title` |
| Bracket index | `{{ items[0].name }}` | `ctx.items[0].name` |
| Filter pipe | `{{ val \| upper }}` | apply filter |
| Filter chain | `{{ val \| upper \| slug }}` | chained filters |
| Filter with arg | `{{ val \| truncate:20 }}` | `filter(val, 20)` |
| Filter named arg | `{{ val \| join:', ' }}` | `filter(val, ', ')` |
| **Function call** (v2) | `{{ TodoList(todos) }}` | `ctx.TodoList(ctx.todos)` |
| Fn call dot-arg | `{{ Card(todo.item) }}` | `ctx.Card(ctx.todo.item)` |
| Raw output | `{{ html \| raw }}` | Unescaped textContent |

---

## 3. Event Binding (ALL DOM events — `@` prefix)

```
@eventname="handler"          in HTML template (Pattern A, B, C)
```

The `@` prefix extracts the event name and passes it directly to
`addEventListener()`. **No whitelist** — any valid DOM event name works.

The `@` prefix extracts the event name and passes it directly to
`addEventListener()`. **No whitelist** — `@click`, `@submit`, `@keydown`,
`@input`, `@animationend`, `@customEvent`, **any** valid DOM event name works.

**Examples:**

```html
<button @click="handleSave">Save</button>
<input @input="onInput($event)" .value="{{ name }}" />
<form @submit="onSubmit($event, ctx.id)">...</form>
<div @mousemove="onDrag($event, clientX)">...</div>
<select @change="onChange($event)">...</select>
```

### Name resolution: `_scope`

Every name in `@click="handleSave"` and `{{ TodoList(todos) }}` is resolved
through a **resolution chain**.

Every name in `@click="handleSave"` and `{{ TodoList(todos) }}` is resolved
through a **resolution chain**. The lookup order is:

```
1. result._scope[name]       ← explicit scope (Pattern B)
2. result._context[name]     ← data context (fallback for any pattern)
3. component instance[name]  ← CE methods (Pattern A/C, auto by vrComponent)
```

This means:
- **Pattern A/C** → `vrComponent` sets `result._scope = this` automatically.
  Methods like `handleSave() { ... }` are found in step 3 (or 1 if `_scope` is set).
- **Pattern B** → one explicit line:
  ```js
  const handleSave = (id) => store.del(id);
  function TodoList(ctx) {
    const result = html`<button @click="handleSave(todo.id)">Save</button>`;
    result._scope = { handleSave };   // ← explicit, one line
    return result;
  }
  ```
- **Pattern C** → same as A: `vrComponent` auto-sets `_scope = this`.
- **Fallback** → if not found in any scope, resolved from `_context`.
  ```js
  ctx.handleSave = (id) => store.del(id);  // works but less idiomatic
  ```

### Handler resolution rules

| Form | Resolves to |
|------|-------------|
| `@click="handleSave"` | `scope.handleSave(event)` |
| `@click="handleSave(id)"` | `scope.handleSave(resolvedId)` |
| `@click="handleSave($event, id)"` | `scope.handleSave(nativeEvent, resolvedId)` |
| `@click="handleSave(id, ctx.name)"` | `scope.handleSave(resolvedId, resolvedName)` |

**Keywords:**
- `$event` → native DOM Event (reserved, evaluated at click-time)
- `id` → resolved from merged scope at render-time (eager)
- Name resolved through: `_scope` → `_context` → component instance

---

## 4. Attribute Binding

| Syntax | Type | Example |
|--------|------|---------|
| `attr="{{ expr }}"` | HTML attribute | `<div class="{{ cls }}">` |
| `attr="{{ expr }}"` | Boolean-ish | `<details open="{{ isOpen }}">` |
| `attr="static"` | Static value | `<div data-part="card">` |
| `.prop="{{ expr }}"` | **DOM property** | `<input .value="{{ name }}">` |

Property binding (`.value`, `.checked`, `.selected`, `.disabled`,
`.indeterminate`, `.innerText`, `.scrollTop`) sets the DOM property
directly instead of `setAttribute()`.

---

## 5. Loops (`<for>`)

```html
<for each="item in items">
  ...body...
</for>
```

| Syntax | Example |
|--------|---------|
| `<for each="todo in ctx.todos">` | Iterates array, each item as `todo` |

The for-loop variable is available inside the `<for>` body:
- Data expressions: `{{ todo.title }}`
- Event bindings: `@click="deleteItem(todo.id)"`

Outside the `<for>` body, the variable is undefined.

**Keyed reconciliation:** uses item identity (object reference or
primitive value) for DOM reuse — add, remove, reorder without
full re-render.

---

## 6. Conditionals (`<if>`)

```html
<if condition="expr">
  ...body...
</if>
```

| Syntax | Example |
|--------|---------|
| `<if condition="todos.length === 0">` | Shows body when truthy |

Condition expression is evaluated against the merged context
(for-loop scope + render context). Truthy → show. Falsy → hide.

---

## 7. Component Composition (v2 — via `{{ FnName(args) }}`)

```html
{{ ComponentName(args) }}
```

| Syntax | Example |
|--------|---------|
| `{{ TodoList(todos) }}` | Renders a Pattern B component inline |
| `{{ ContactCard(contact) }}` | Renders another component with data |

The component function **must** be resolvable through the standard
scope resolution chain (same as `@click`):

```
1. result._scope[name]       ← explicit scope
2. result._context[name]     ← data context
3. component instance[name]  ← CE methods (auto by vrComponent)
```

Typical usage:

- **Pattern A**: method on the class → auto-resolved by `vrComponent`
- **Pattern B**: `result._scope = { TodoList, handleSave }`
- **Pattern C**: same as A, or passed via `_scope`/`_context`

The function receives the resolved args and **must** return a
`TemplateResult` (`{ kind: 'template-result', strings, values }`).
The `ExprPart` renders this as a nested template.

### Nesting works:

```
Pattern C (external .template.html)
  └── {{ PatternB(ctx) }}    ← fn call in {{ }}
        └── <pattern-a-ce>   ← native CE, independent lifecycle
```

---

## 8. Two-Way Binding (REMOVED in v2)

The `model` directive is removed with `${}`. Use `@input` instead:

```html
<input .value="{{ name }}" @input="onNameInput($event)">
```

With handler:

```js
const _scope = {
  onNameInput: (e) => { store.state.name = e.target.value; },
};
```

---

## 9. Reactive Pipeline

```
1. store.state.todos = [...]       ← user mutates store
2. Proxy trap fires                ← store:change event
3. tickState.set(now)              ← Signal.State notifies
4. Signal subscribers invalidate   ← ComputedSignal marks dirty
5. Microtask flush                 ← scheduler runs effects
6. effect re-runs:
   a. renderContext.get()          ← re-evaluate ComputedSignal
   b. Component.render(ctx)        ← returns TemplateResult
   c. render(result, el)           ← TemplateInstance.updateWithContext
   d. ExprParts re-evaluate {{ }}  ← data interpolation updates
   e. ForParts reconcile           ← add/remove/move DOM nodes
   f. IfParts evaluate condition   ← show/hide
   g. ClickHandlerParts: stable    ← handlers don't change
7. DOM updated
```

All three patterns (A, B, C) use the **same pipeline**.

---

## 10. Complete Bootstrap Sequence

```js
import { Store, Signal, effect, html, render, registerFilter }
  from './core/index.js';

// 1. Store + TickState
const store = new Store({ title: 'Hello', todos: [] });
const tickState = new Signal.State(0, { equals: () => false });
window.addEventListener('store:change', () => tickState.set(performance.now()));

// 2. Filters
registerFilter('upper', v => String(v).toUpperCase());

// 3. Render context (ComputedSignal)
const renderContext = new Signal.Computed(() => {
  tickState.get();
  return { title: store.state.title, todos: store.state.todos };
});

// 4. Mount effect
effect(() => {
  const ctx = renderContext.get();
  const result = App.render(ctx);
  result._context = ctx;
  result._scope = { handleSave };
  render(result, document.getElementById('app'));
});

// 5. Kick
tickState.set(performance.now());
```

---

> **Reference document** — part of `pix-galaxy-mcp` skill ecosystem.
> See `skills/pix-frontend-vanilla-reactive/SKILL.md` for full pattern documentation.
