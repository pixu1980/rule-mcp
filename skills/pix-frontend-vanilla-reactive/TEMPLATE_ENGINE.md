# pix-vanilla-reactive — Template Engine Capabilities

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

**Important:** `{{ }}` expressions resolve variable names against `result._scope`
FIRST, then `result._context` as fallback. See §3 for the full resolution chain.
JS closure scope is NOT accessible from template strings — JavaScript provides
no API to enumerate closure variables at runtime.

| Form | Example | Resolves to |
|------|---------|-------------|
| Dot-path variable | `{{ todo.title }}` | `scope.todo.title` → `ctx.todo.title` |
| Bracket index | `{{ items[0].name }}` | `scope.items[0].name` → `ctx.items[0].name` |
| Filter pipe | `{{ val \| upper }}` | apply filter |
| Filter chain | `{{ val \| upper \| slug }}` | chained filters |
| Filter with arg | `{{ val \| truncate:20 }}` | `filter(val, 20)` |
| Filter named arg | `{{ val \| join:', ' }}` | `filter(val, ', ')` |
| **Function call** | `{{ TodoList(todos) }}` | `scope.TodoList(scope.todos)` → `ctx.TodoList(ctx.todos)` |
| Fn call dot-arg | `{{ Card(todo.item) }}` | `scope.Card(scope.todo.item)` → `ctx.Card(ctx.todo.item)` |
| Raw output | `{{ html \| raw }}` | Unescaped textContent |

---

## 3. Event Binding (ALL DOM events — `@` prefix)

```
@eventname="handler"          in HTML template (Pattern A, B, C)
```

The `@` prefix extracts the event name and passes it directly to
`addEventListener()`. **No whitelist** — `@click`, `@input`, `@animationend`,
`@customEvent`, **any** valid DOM event name works.

**Examples:**

```html
<button @click="handleSave">Save</button>
<input @input="onInput($event)" .value="{{ name }}" />
<form @submit="onSubmit($event, ctx.id)">...</form>
<select @change="onChange($event)">...</select>
```

### Name resolution: `_scope`

Every name in `@click="handleSave"` and `{{ TodoList(todos) }}` is resolved
through a **resolution chain**:

```
1. result._scope[name]       ← explicit scope object
2. result._context[name]     ← data context (fallback)
3. component instance[name]  ← CE methods (Pattern A/C, auto by vrComponent)
```

**Pattern A/C** → `vrComponent` sets `_scope = this` automatically.
Component methods resolve in step 3 (or 1 if `_scope` is set).
Zero extra work.

**Pattern B** → one explicit line:
```js
result._scope = { handleSave, TodoList };   // ← explicit
```

**Pattern C → B** (calling a Pattern B fn from external template):
prefer pass via `_context` — the component fn is data, not a handler:
```js
context() {
  return {
    todos: store.state.todos,
    TodoList: TodoList,    // ← in context for Pattern C → B
  };
}
```

### Why not automatic closure resolution?

Tagged template literals (`html\`\``) receive only **string parts** and
**value slots** (the `${}` positions). With `${}` removed, values is empty.
The function names inside the template strings (`"handleSave"`, `"TodoList"`)
are not automatically linked to the JavaScript closure scope — there is no
standard API to enumerate a caller's closure variables at runtime.

To resolve names automatically at `html\`\`` call time, we would need:
- `eval()` in the `html` function — breaks CSP, blocked in strict mode
- A Babel plugin (build-time analysis) — adds a build step, pix is
  zero-dependency runtime

**Decision:** keep explicit `_scope` / `_context` for all patterns.
A future compile-time plugin can auto-generate `_scope` from variable
usage analysis, but it's optional.

### Handler resolution rules

| Form | Resolves to |
|------|-------------|
| `@click="handleSave"` | `scope.handleSave(event)` |
| `@click="handleSave(id)"` | `scope.handleSave(resolvedId)` |
| `@click="handleSave($event, id)"` | `scope.handleSave(nativeEvent, resolvedId)` |
| `@click="handleSave(id, ctx.name)"` | `scope.handleSave(resolvedId, resolvedName)` |

**Keywords:**
- `$event` → native DOM Event (click-time, reserved)
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

## 6. Conditionals (`<if>` / `<elseif>` / `<else>`)

```html
<if condition="expr1">
  body when expr1 is truthy
<elseif condition="expr2">
  body when expr2 is truthy (expr1 was falsy)
<else>
  fallback body (all conditions false)
</if>
```

| Syntax | Example |
|--------|---------|
| `<if condition="todos.length === 0">` | First branch, evaluated first |
| `<elseif condition="done">` | Evaluated when all previous conditions are falsy |
| `<else>` | Fallback — no condition, runs if all above are falsy |

Conditions are evaluated IN ORDER. The first truthy branch wins.
At most one branch renders at a time.

### `<switch>` / `<case>` / `<default>`

```html
<switch expr="status">
  <case result="active">Active content</case>
  <case result="pending">Pending content</case>
  <default>Default content</default>
</switch>
```

| Syntax | Example |
|--------|---------|
| `<switch expr="status">` | Evaluates `status` against each case |
| `<case result="active">` | Renders body when `status === 'active'` |
| `<default>` | Fallback when no case matches |

The `expr` value is converted to string and compared with `===` against
each `<case result="...">`. `<default>` renders when no case matches.

---

## 7. Component Composition (via `{{ FnName(args) }}`)

`{{ FnName(args) }}` calls a **function** that returns a `TemplateResult`.
The function is resolved through the standard scope chain (§3).

### Requirements

The name MUST resolve to a **plain function** that:
- Takes data as argument(s)
- Returns `{ kind: 'template-result', strings, values }` (TypeScript: `TemplateResult`)

```html
{{ TodoList(todos) }}         ← calls scope.TodoList(scope.todos)
                                TodoList MUST return a TemplateResult
```

### What works

| Form | Works? | Reason |
|------|--------|--------|
| `{{ PatternB(todos) }}` | ✅ | Pattern B returns `TemplateResult` |
| `{{ wrapCE(todo) }}` wrapping `<my-ce>` | ✅ | Factory fn returns `html\`\`` containing the tag |
| `{{ todoItem.data }}` | ❌ | `todoItem` is a CE class, calling it returns a DOM element, not `TemplateResult` |
| `<my-ce></my-ce>` in template | ✅ | Native CE lifecycle via browser registry |

### Custom Element composition (CEs in template markup)

Custom Elements are composed via HTML tags, **not** `{{ }}`:

```html
<for each="todo in todos">
  <todo-item data-id="{{ todo.id }}"></todo-item>
</for>
```

The browser's Custom Element registry upgrades `<todo-item>` automatically.
No function call needed.

### Wrapping a CE for `{{ }}` composition

To use a CE inside `{{ }}`, wrap it in a factory function:

```js
function TodoItemWrap(todo) {
  return html`<todo-item data-id="{{ todo.id }}"></todo-item>`;
}
// Then: {{ TodoItemWrap(todo) }}
```

### The resolution limit: closures are NOT accessible

JavaScript provides **no API** to inspect closure scope at runtime.
When `html\`\`` is evaluated, only the template strings are available —
the function references in the surrounding scope are invisible to the engine.

You MUST pass functions explicitly via `result._scope`:

```js
const handleSave = (id) => store.del(id);

function TodoList(ctx) {
  const result = html`<button @click="handleSave(todo.id)">Save</button>`;
  result._scope = { handleSave };   // ← explicit, one line, REQUIRED
  result._context = ctx;
  return result;
}
```

For **Pattern A/C**, `vrComponent` auto-sets `_scope = this`, so component
methods are resolved automatically.

### Nesting example

```
Pattern C (external .template.html)
  └── {{ PatternB(todos) }}    ← fn call, resolved from _scope
        └── <pattern-a-ce>     ← native CE, independent lifecycle
```

---

## 8. Two-Way Binding

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
   g. EventParts: resolve handlers from _scope (stable, no re-bind on re-render)
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
