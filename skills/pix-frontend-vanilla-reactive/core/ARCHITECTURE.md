# Architecture & Performance Guide

This document covers the internal architecture, performance characteristics, and
design decisions of the rule-frontend-vanilla-reactive core engine.

---

## Directory Structure

```
core/
  index.js                   ← Unified public API (re-exports everything)
  signals/                   ← Signal system (State, Computed, effect)
  store/                     ← Proxy Store (auto-creates store.tick)
  template-engine/           ← html, render, getTemplate, loadTemplate
  dom-parts/                 ← DOMPart classes (EventPart, ForPart, …)
  decorator/
    _vr-component.js         ← vrComponent() decorator
```

**No build step.** All files are plain ES modules. Serve with any HTTP server
(Vite, `npx serve`, caddy, etc.). `file://` protocol won't work for ES modules.

---

## Data Flow

```
User input → @click="handler()" → store.state.X = Y
  → Proxy trap fires → store.tick.set()
    → Signal subscribers invalidate → ComputedSignal marks dirty
      → Microtask flush (scheduler) → effect() runs
        → TemplateInstance.updateWithContext()
          → Parts write to DOM (ChildNodePart, ExprPart, ForPart, …)
```

### Sync vs Microtask

| Phase | When | What runs |
|-------|------|-----------|
| Sync | During `store.tick.set()` | Signal invalidation, effect scheduling |
| Microtask | After current script | Effects (render, document sync) |

The scheduler batches by Set identity + `queueMicrotask` — multiple
invalidations of the same effect collapse to a single run.

```js
store.state.count = 1;
store.state.count = 2;
store.state.count = 3;
// effect runs ONCE, with count === 3
```

---

## Template Syntax Reference

### 1. Data Interpolation (`{{ }}`)

| Syntax | Type | Escaped | Example |
|--------|------|---------|---------|
| `{{ expr }}` | data | ✅ | `<h1>{{ title }}</h1>` |
| `{{ expr \| raw }}` | data | ❌ | `<div>{{ htmlContent \| raw }}</div>` |

#### Expression examples

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

#### Built-in filters

```
upper, lower, capitalize, slugify, slug, trim,
escapeHtml, striptags, raw, json, default,
truncate, length, first, last, join,
tagLabel, tagHref, date, timeAgo, urlencode, sortBy,
where
```

#### Expression parsing (inside `{{ }}`)

| Form | Example | Resolves to |
|------|---------|-------------|
| Dot-path variable | `{{ todo.title }}` | `_context.todo.title` (falls back to `_scope`) |
| Bracket index | `{{ items[0].name }}` | `_context.items[0].name` |
| Filter pipe | `{{ val \| upper }}` | Apply filter to resolved value |
| Filter chain | `{{ val \| upper \| slug }}` | Pipe through filters left-to-right |
| Filter with arg | `{{ val \| truncate:20 }}` | `filter(resolvedVal, 20)` |
| **Function call** | `{{ TodoList(todos) }}` | Resolve `TodoList` from `_scope`→`_context`, call with args |
| Raw output | `{{ expr \| raw }}` | Inserted as innerHTML (not textContent) — opt-in XSS |

`{{ }}` expressions resolve variable names against `result._scope` FIRST,
then `result._context` as fallback. JS closure scope is NOT accessible
from template strings.

---

### 2. Event Binding (`@` prefix)

```
@eventname="handler(args)"     in template (all patterns)
```

Every valid DOM event name works — `@click`, `@input`, `@animationend`,
`@customEvent`. No whitelist.

#### Examples

```html
<button @click="handleSave">Save</button>
<input @input="onInput($event)" .value="{{ name }}" />
<form @submit="onSubmit($event)">...</form>
<select @change="onChange($event)">...</select>
```

#### Handler resolution rules

| Form | Resolves to |
|------|-------------|
| `@click="handleSave"` | `scope.handleSave(event)` — auto-injects `$event` |
| `@click="handleSave(id)"` | `scope.handleSave(resolvedId)` |
| `@click="handleSave($event, id)"` | `scope.handleSave(nativeEvent, resolvedId)` |

#### The `_scope` resolution chain

Every name in `@click="handler"` and `{{ Fn(...) }}` resolves through:

```
1. result._scope[name]       ← explicit scope object (Pattern B)
2. result._context[name]     ← data context (fallback)
3. component instance[name]  ← CE methods (Pattern A, auto by vrComponent)
```

**Pattern A (vrComponent):** `vrComponent` sets `_scope = this` automatically.
Component methods resolve in step 1. Zero extra work.

**Pattern B (Functional):** one explicit line:
```js
result._scope = { handleSave, TodoList };
```

**Pattern C (ext. HTML):** methods on the CE class resolve via step 1 (auto).
Functions passed from parent go in `_context`:
```js
context() {
  return { todos: store.state.todos, TodoList };
}
```

#### Why not automatic closure resolution?

Tagged template literals receive only **string parts**. The function names
inside `"handleSave"` are not linked to JavaScript closure scope — there
is no API to enumerate closure variables at runtime.

Solutions considered:
- `eval()` — breaks CSP, blocked in strict mode ❌
- Babel plugin — adds build step, violates zero-dep ❌
- **Explicit `_scope` / `_context`** — verbose but reliable ✅

---

### 3. Attribute Binding

| Syntax | Type | Example |
|--------|------|---------|
| `attr="{{ expr }}"` | HTML attribute | `<div class="{{ cls }}">` |
| `attr="{{ expr }}"` | Boolean-ish | `<details open="{{ isOpen }}">` |
| `.prop="{{ expr }}"` | **DOM property** | `<input .value="{{ name }}">` |

Property binding (`.value`, `.checked`, `.disabled`, `.scrollTop`)
sets the DOM property directly instead of `setAttribute()`.

---

### 4. Loops (`<for>`)

```html
<for each="item in items">
  ...body...
</for>
```

The loop variable (`item`) is available inside the `<for>` body:
`{{ item.title }}`, `@click="del(item.id)"`. Outside the `<for>` body,
the variable is undefined.

**Keyed reconciliation:** uses item identity (object reference or
primitive value) for DOM reuse — add, remove, reorder without
full re-render.

---

### 5. Conditionals (`<if>` / `<elseif>` / `<else>` / `<switch>`)

```html
<if condition="expr1">
  body when expr1 is truthy
<elseif condition="expr2">
  body when expr2 is truthy
<else>
  fallback body
</if>
```

Conditions evaluated IN ORDER. First truthy branch wins.

```html
<switch expr="status">
  <case result="active">Active content</case>
  <case result="pending">Pending content</case>
  <default>Default content</default>
</switch>
```

`<switch>` compares `String(expr)` === `<case result>`.

---

### 6. Component Composition (`{{ FnName(args) }}`)

`{{ FnName(args) }}` calls a function that returns `TemplateResult`.
The function is resolved through the standard `_scope` chain.

```html
{{ TodoList(todos) }}  ← calls scope.TodoList(scope.todos)
```

| Form | Works? | Reason |
|------|--------|--------|
| `{{ PatternB(todos) }}` | ✅ | Functional component → `TemplateResult` |
| `{{ wrapCE(todo) }}` | ✅ | Factory returns `html\`\`` |
| `<my-ce></my-ce>` | ✅ | Native CE composition via registry |
| `{{ CEclass(data) }}` | ❌ | CE constructor returns DOM element, not `TemplateResult` |

**To use a CE inside `{{ }}`, wrap it:**
```js
function TodoItemWrap(todo) {
  return html`<todo-item data-id="{{ todo.id }}"></todo-item>`;
}
```

#### Nesting example

```
Pattern A (CE + vrComponent)
  └── {{ PatternB(todos) }}    ← fn call, resolved from _scope
        └── <pattern-a-ce>     ← native CE, independent lifecycle
```

---

### 7. Two-Way Binding

```html
<input .value="{{ name }}" @input="onNameInput($event)">
```

```js
const _scope = {
  onNameInput: (e) => { store.state.name = e.target.value; },
};
```

---

## Store Architecture

### What it is

A recursive Proxy wrapping a plain state object. Every nested object gets its
own Proxy, created lazily on first access.

```js
const store = new Store({ todos: [{ title: 'x', done: false }] });
// store.state.todos      → Proxy for array
// store.state.todos[0]   → Proxy for object
```

### What it is NOT

- Not an event bus (no pub/sub other than `store:change`)
- Not a state machine (no guards, no transitions)
- Not an ORM (no schema, no relations)

### Proxy behavior

| Mutation | Trap fired | Notes |
|----------|-----------|-------|
| `store.state.x = 1` | `set` | Fires change event |
| `store.state.x.y = 1` | `get` on x (returns Proxy), then `set` on that Proxy | ✅ |
| `store.state.todos.push(x)` | `get` on todos, then multiple `set` for length + indices | ✅ |
| `store.state.arr[0] = x` | `set` on arr Proxy | ✅ |
| `delete store.state.x` | `deleteProperty` | ✅ |
| `store.replace(next)` | None (manual emission) | Single change event |

### store.tick (auto-created)

Every `Store` instance automatically creates `store.tick` — a `Signal.State`
with `equals: () => false` (always fires, never short-circuits).

```js
const store = new Store({ count: 0 });
// store.tick exists automatically

// In a ComputedSignal:
const ctx = new Signal.Computed(() => {
  store.tick.get();  // subscribe to store changes
  return store.state.count;
});
```

Disable with: `new Store(data, { autoTick: false })`

### Performance: _emitChange

The old implementation called `deepClone` on old AND new values for every
mutation, then dispatched them in the `store:change` CustomEvent detail.
For a store with 1000 todo items, this meant 2000+ object allocations per
keystroke. **Removed.** The event now carries only the path string.

If you need old/new values for debugging:
```js
window.addEventListener('store:change', (e) => {
  const { path } = e.detail;
  // Read current value: store.get(path)
});
```

### Multiple stores

**Yes**, but with caveats:

```js
const a = new Store({ x: 1 });
const b = new Store({ y: 2 });
```

- Both emit `store:change` on `window` (default `events` target)
- `store.tick` is per-instance — no collision
- DX challenge: components must know which store to import
- **Recommendation:** 1 store per app. Use `Signal.State` for local/UI state.

```js
// Local signal (no Store needed)
const isOpen = new Signal.State(false);

// Shared state
const store = new Store({ todos: [] });
```

### Is the Store necessary?

**No.** The template engine only needs `_context` (for `{{ }}`) and `_scope`
(for `@click`). You can use `Signal.State` directly:

```js
const count = new Signal.State(0);
render(html`<p>{{ count }}</p>`, root, { count });
```

But Store provides:
- Mutable syntax (`store.state.x = 1` vs `count.set(count.get() + 1)`)
- Automatic deep reactivity (Proxy traps everything)
- `store.tick` for one-stop change notification

---

## Signal System

### Cost

| Signal | Allocations per tick |
|--------|---------------------|
| `StateSignal` | Constructor: 1 object. `set()`: 0-1 |
| `ComputedSignal` | Constructor: 1 object. `evaluate()`: 0-N deps |
| `EffectCollector` | Constructor: 1. `run()`: N deps |
| `BaseSignal.notify()` | Iterates Set directly (no spread) |

Total: ~138 lines, ~700 bytes gzipped.

### Are Signals necessary?

**Yes for reactivity.** Without Signals, the engine has no way to know when
state changes. Alternatives:

| Mechanism | Pros | Cons |
|-----------|------|------|
| Signals (current) | Fine-grained, lazy, automatic tracking | Learning curve |
| `EventTarget` + CustomEvent | Simple, native | Manual wiring, no fine-grained deps |
| `Proxy` + `Object.defineProperty` | Reactive by default | Complex, no lazy eval |

### When NOT to use Signals

- Static content (rendered once, never changes)
- Ephemeral UI state (hover, focus) — use `:hover` CSS
- Animations — use `requestAnimationFrame` + CSS transitions

---

## Performance: DOMParts

### Optimizations

| Part | Optimization | Impact |
|------|-------------|--------|
| `ForPart` | `Object.create(ctx)` instead of spread `{...ctx}` | -1 allocation per item per reconcile |
| `IfPart` / `SwitchPart` | `_exprCache` for parsed expressions | -N `parseExpression()` calls per render |
| `EventPart` | `bind()` guard (skip if already bound) | -N `addEventListener` calls per render |
| `ChildNodePart` | Template identity check (`strings === strings`) | Skip re-parse on no-change |

### renderRawTemplate

`<if>`, `<elseif>`, `<else>`, `<case>`, `<default>` branch bodies are stored
as raw strings and rendered via `renderRawTemplate()`. This function:

1. Parses `{{ }}` expressions ONCE (cached in `_exprCache` keyed by template string)
2. Evaluates them against context
3. Creates `<template>` element for `innerHTML` parsing
4. Returns `DocumentFragment` of child nodes

### EventPart lifecycle

Event listeners are created once in `bind()` and persist for the lifetime of
the `TemplateInstance`. Subsequent `updateWithContext()` calls update the
resolved handler reference (if changed) but do NOT create new listeners.

**Memory:** Listeners are NOT removed when a `TemplateInstance` is replaced
(e.g., when `ChildNodePart.commitTemplate()` swaps templates). This is a
minor leak — in practice, TemplateInstances are reused (cached by strings
identity in `getTemplate()`), so they're rarely replaced.

**If you manually replace TemplateInstances**, call `destroy()` on the old one
(see `TemplateInstance.destroy()` proposal below).

---

## Core Web Vitals

| Metric | Impact | Score |
|--------|--------|-------|
| **LCP** | Template engine uses `<template>` + `innerHTML` only for `|raw` filter and `<if>` branches. No massive reflow. | ✅ Good |
| **FID / INP** | `@click` is native `addEventListener`. Re-render via microtask batching. | ✅ Good |
| **CLS** | `render()` uses marker comments (`<!--start-->` / `<!--end-->`) — replaces content in-place. No layout shift. | ✅ Good |
| **Bundle** | Core ≈ 1.8 KB gzipped (Signal + Store + Template + Parts). | ✅ Excellent |
| **Memory** | Proxy wrappers for every nested object in state. Non-trivial for deeply nested stores. | ⚠️ Moderate |

---

## Known Limitations & Fixes

### 1. TemplateInstance.destroy() — missing cleanup

When a `TemplateInstance` is replaced (in `ChildNodePart.commitTemplate()`),
its `EventPart` listeners and `ForPart`/`IfPart`/`SwitchPart` DOM nodes are
not cleaned up.

**Proposed fix:**
```js
class TemplateInstance {
  destroy() {
    for (const ep of this.eventParts) ep.dispose();
    for (const fp of this.forParts) fp.destroy();
    for (const ip of this.ifParts) ip.destroy();
    for (const sp of this.switchParts) sp.destroy();
  }
}

// In ChildNodePart.commitTemplate():
if (this.currentTemplateInstance) {
  this.currentTemplateInstance.destroy();
}
```

### 2. EventPart auto-inject — may add unwanted $event

```js
@click="handleSave(todo.id)"  // args = [todo.id], NO auto-inject ✅
@click="handleSave"           // args = [], auto-injects [$event] ⚠️
```

If `handleSave` doesn't expect `$event`, the extra argument is harmless but
misleading. **Add explicit `$event` even if unused** to make intent clear:
```js
@click="handleSave($event, todo.id)"  // ✅ explicit
```

### 3. computed signals + store.tick.get()

Every ComputedSignal that reads `store.state.X` MUST also read
`store.tick.get()` or it won't re-evaluate on store changes:

```js
// WRONG — never re-evaluates:
const x = new Signal.Computed(() => store.state.count);
// RIGHT:
const x = new Signal.Computed(() => { store.tick.get(); return store.state.count; });
```

### 4. renderRawTemplate creates DOM elements per branch

Each `<if>`/`<switch>` render creates a `<template>` element via `innerHTML`.
This is cheap (~0.01ms) but cumulative for documents with 100+ branches.

**Fix:** Pre-parse branch bodies into compiled `TemplateInstance`s, reusing
`getTemplate()` instead of `innerHTML`.

---

## Migration Guide

### "I just need a counter" — minimal setup (no Store)

```js
import { html, render } from './core/index.js';

let count = 0;
const root = document.getElementById('app');

document.getElementById('btn').onclick = () => {
  count++;
  render(html`<p>{{ count }}</p>`, root, { count });
};

render(html`<p>{{ count }}</p>`, root, { count });
```

### "I need reactive state" — add Signal

```js
import { Signal, html, render, effect } from './core/index.js';

const count = new Signal.State(0);

effect(() => {
  render(html`<p>{{ count }}</p>`, document.getElementById('app'), { count });
});

document.getElementById('btn').onclick = () => count.set(count.get() + 1);
```

### "I need complex state" — add Store

```js
import { Store, vrComponent, html } from './core/index.js';

const store = new Store({ count: 0 });

class App extends HTMLElement {
  static { vrComponent(this, { tag: 'my-app' }); }
  inc() { store.state.count++; }
  context() { return { count: store.state.count }; }
  render(ctx) { return html`<p @click="inc()">{{ count }}</p>`; }
}
```
