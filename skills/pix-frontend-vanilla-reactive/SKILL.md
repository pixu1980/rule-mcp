---
name: rule-frontend-vanilla-reactive
description: >-
  Use when building reactive web UIs without frameworks. Covers Proxy-based Store, Signals, html`` tagged templates, custom elements, and adoptedStyleSheets.
tags:
  - "frontend"
  - "vanilla"
  - "reactive"
frameworks: [vanilla]
---

# rule-frontend-vanilla-reactive

Complete vanilla JS reactive framework pattern.
Zero framework dependencies. No build step required.

Four example apps in `examples/apps/`:
```
apps/vr-component/               Counter (CustomElement vrComponent)
apps/fn-component/               List (Functional Component)
apps/vr-component-html/          User card (CustomElement vrComponent + ext. HTML)
apps/combo/                      Todo (all 3 patterns mixed)
```
Serve with any HTTP server and open each `index.html`.

## Quickstart: Hello World in 5 Minutes

Create this minimal app to verify your setup.

**`index.html`** — just a custom element tag + module script:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
</head>
<body>
  <app-root></app-root>
  <script type="module" src="./index.js"></script>
</body>
</html>
```

**`index.js`** — bootstrap (imports the component, no further code needed):
```js
import './_App.js';
```

**`_App.js`** — Store + Component:
```js
import { Store, vrComponent, html } from '../core/index.js';

const store = new Store({ title: 'Hello World' });  // auto-tick

class App extends HTMLElement {
  static { vrComponent(this, { tag: 'app-root', css: import.meta.url }); }
  context() { return { title: store.state.title }; }
  render(ctx) { return html`<h1>{{ title | upper }}</h1>`; }
}
```
No manual `tickState`, no `window.addEventListener`, no `store.tick.set()` —
all automatic. Just `new Store()` and the component is reactive.
```

**Pattern C simplification:** pass `template:` in vrComponent options —
no `render()` method needed (see §5C).

**Serve** via `pnpm dev` (Vite), `npx serve`, o qualsiasi HTTP server.
I moduli ES (`type="module"`) NON funzionano con `file://`.

---

## 1. Store — Proxy-based State Container

### API Reference

```js
import { Store } from "./core/store/index.js";

const store = new Store(initialState, options);
store.state              // Proxy-wrapped state tree (mutate directly)
store.get(path)          // Read by dot-path
store.set(path, value)   // Write by dot-path
store.update(path, fn)   // (current) => next
store.replace(nextState) // Replace entire tree
store.snapshot()         // Deep-cloned snapshot
```

### Key Rules

1. **Mutate directly** on `store.state`: `store.state.todos[0].title = "x"` — Proxy traps handle change events.
2. **Replace arrays/objects** immutably: `store.state.todos = [...store.state.todos, newTodo]`.
3. **`store.replace()`** triggers a single change event (auto-tick fires).
4. **Never pass raw proxy references** outside the store. Use `deepClone` for exports.
5. **Change events** emit `store:change` CustomEvent with `{ path, oldValue, newValue }`.

### Files (in `core/store/`)

| File | Export | Purpose |
|------|--------|---------|
| `_store.js` | `Store` | Proxy-based state container |
| `_clone.js` | `deepClone`, `clonePlainValue` | Handles Date, RegExp, Map, Set, arrays |
| `_guards.js` | `isObject` | Type guard |
| `_paths.js` | `toPathArray`, `pathToString` | Path utilities |

Full source: `core/store/`

---

## 2. Signals — Fine-grained Reactivity

### API Reference

```js
import { Signal, effect } from "./core/signals/index.js";

// State signal
const count = new Signal.State(0);
count.get();            // → 0 (tracks dependency in active collector)
count.set(5);           // notifies subscribers (unless equal)
count.peek();           // read without tracking

// Computed signal (lazy, derived)
const doubled = new Signal.Computed(() => count.get() * 2);
doubled.get();          // → 10 (lazy evaluate if dirty)

// Effect (auto-track + re-run on change)
const dispose = effect(() => { console.log(count.get()); });
dispose();              // stop the effect

// Untracked reads inside effects
Signal.subtle.untrack(() => { console.log(count.peek()); });
```

### Files (in `core/signals/`)

| File | Export | Lines |
|------|--------|-------|
| `_base-signal.js` | `BaseSignal` | subscribe, track, notify |
| `_state-signal.js` | `StateSignal` | get, set, peek with equality check |
| `_computed-signal.js` | `ComputedSignal` | lazy eval, dirty tracking, dependency collection |
| `_collector-context.js` | `withCollector`, `withoutCollector` | Stack-based tracking context |
| `_effect-collector.js` | `EffectCollector` | Auto-track + dynamic resubscription |
| `_scheduler.js` | `schedule` | Microtask-batched effect scheduling |
| `index.js` | `Signal`, `effect`, `isSignalLike` | Unified exports |

### Key Rules

1. **`get()`** triggers `track()` — registers dependency in active collector.
2. **`set()`** triggers `notify()` if value changed (custom `equals` fn).
3. **ComputedSignal** is lazy — only re-evaluates on `get()` when dirty.
4. **Effects** automatically re-collect dependencies on every run (dynamic graph).
5. **Scheduler** batches by Set identity + microtask — multiple invalidations collapse to one run.
6. **`peek()`** reads without tracking. Use inside effects when you need a value without subscribing.

---

## 3. The TickState Bridge

Every `Store` instance auto-creates a `store.tick` Signal that fires on every
state mutation. No manual wiring needed.

```js
const store = new Store({ count: 0 });
// store.tick is a Signal.State with equals: () => false
// store.tick.set() is called automatically on every state change
```

### Usage in computed signals

```js
// Every computed that reads store.state MUST also read store.tick.get()
const renderContext = new Signal.Computed(() => {
  store.tick.get();  // subscribe to store changes
  return { count: store.state.count };  // read current data
});
```

### Disable auto-tick

```js
const store = new Store(data, { autoTick: false });
```

### Store is the truth, signals are the notification mechanism

Every computed that reads `store.state.X` MUST also read `store.tick.get()
{ store.tick.get(); return store.state.count; }
` to re-evaluate on store changes.

```js
// WRONG — won't re-evaluate on store changes:
const myComputed = new Signal.Computed(() => store.state.todos.length);
// RIGHT:
const myComputed = new Signal.Computed(() => { store.tick.get(); return store.state.todos.length; });
```
- Computed signals still cache — if value didn't change, downstream not invalidated.
- For large apps (>10k reactive nodes), consider path-based selective invalidation.

---

## 4. Template Engine

### API Reference

**Two expression systems:** `{{ expr }}` for data, `@event="handler"` for events.
Two-way binding via `@input` + `.value`.

> **What is `_scope`?** Every `@click="handler"` and `{{ FnName(args) }}`
> needs to find the function. `result._scope` is where you put those functions.
> For Pattern CustomElement vrComponent, `vrComponent` sets `_scope = this` automatically — methods
> on the class ARE the scope. For Pattern Functional Component, set it manually: `result._scope = { fn }`.
> Full resolution chain documented in §5.

```js
import { html, loadTemplate, render, registerFilter }
  from "./core/template-engine/index.js";

// html tagged template (wraps strings + values)
const result = html`<h1>{{ title | upper }}</h1>`;

// loadTemplate: fetch + parse external .template.html (Pattern CustomElement vrComponent with External HTML)
const TPL = await loadTemplate(import.meta.url, './_Card.template.html');

// html from string (alternative)
const fromFile = html(`<h1>{{ title }}</h1>`);

// render into container
render(result, document.getElementById("app"));

// Register a filter
registerFilter("upper", v => String(v).toUpperCase());

// Scope for @click handler resolution (see §5)
result._scope = { handleSave };   // handlers here
result._context = { title: 'Hello' };  // data here
```
```

### Expression Systems

| Syntax | Part Type | Behavior | Example |
|--------|-----------|----------|---------|
| `{{ expr }}` | ExprPart | Data expression with filter pipes | `<p>{{ title \| upper }}</p>` |
| `{{ Fn(args) }}` | ExprPart | Function call returning TemplateResult | `{{ TodoList(todos) }}` |
| `attr="{{ expr }}"` | AttributePart | HTML attribute from context | `<div class="{{ cls }}">` |
| `.prop="{{ expr }}"` | PropertyPart | DOM property (not setAttribute) | `<input .value="{{ name }}">` |
| `@event="handler(args)"` | EventPart | Event listener, resolved from _scope | `<button @click="handleSave(id)">` |
| `<for each="x in xs">` | ForPart | Loop with keyed reconciliation | `<for each="todo in todos">` |
| `<if condition="expr1">...<elseif condition="expr2">...<else>...</if>` | IfPart | Multi-branch conditional | `<if condition="done">Done<else>Pending</if>` |
| `<switch expr="x"><case result="v">...<default>...</switch>` | SwitchPart | Multi-way branch on value match | `<switch expr="s"><case result="a">A</case><default>?</default></switch>` |
| `{{ expr \| raw }}` | ExprPart | Unescaped HTML output | `<div>{{ content \| raw }}</div>` |

### Built-in Filters

`upper`, `lower`, `capitalize`, `slugify`, `slug`, `trim`, `escapeHtml`,
`striptags`, `raw`, `json`, `default`, `truncate`, `length`, `first`, `last`,
`join`, `tagLabel`, `tagHref`, `date`, `timeAgo`, `urlencode`, `sortBy`

### Data Context + Scope Flow

Components receive a context object for `{{ }}` data and a scope object for
`@click` handler resolution:

```js
const ctx = { title: "Hello", todos: [...] };
const handleSave = (id) => store.del(id);

const result = App.render(ctx);
result._context = ctx;         // enables {{ }} expression resolution
result._scope = { handleSave }; // enables @click="handleSave(args)"
render(result, root);
```

**Resolution order for all names** (handlers AND component functions):

```
1. result._scope[name]       ← explicit scope (Pattern Functional Component)
2. result._context[name]     ← data context (fallback)
3. component instance[name]  ← CE methods (Pattern CustomElement vrComponent, auto by vrComponent)
```

### Files (in `core/template-engine/`)

| File | Export |
|------|--------|
| `_template.js` | `render()` |
| `_template-instance.js` | `TemplateInstance`, `getTemplate` (parser with `{{ }}`/`<for>`/`<if>`) |
| `_expression-parser.js` | `parseExpression`, `evaluateExpression` |
| `_filters.js` | `registerFilter`, `FILTERS`, built-in filters (18 filters) |
| `_template-helpers.js` | `html` |
| `_child-node-part.js` | ChildNodePart (text, template, signal) |
| `_attribute-part.js` | AttributePart |
| `_expr-part.js` | ExprPart (`{{ }}` + `{{ Fn() }}` composition) |
| `_for-part.js` | ForPart (`<for>` loop, keyed reconciliation) |
| `_if-part.js` | IfPart + SwitchPart (`<if>`/`<elseif>`/`<else>` + `<switch>`/`<case>`/`<default>`) |
| `_event-part.js` | EventPart (`@event="handler(args)"`) |
| `_property-part.js` | PropertyPart (`.value="{{ }}"`) |
| `_range.js` | `clearRange`, `moveRangeBefore` |

Full source: `core/template-engine/`

---

## 5. Component Patterns (2 patterns + 1 variant)

Two patterns + one variant. All share the same pipeline
(Store → Signals → Template Engine → DOMParts → DOM).

| # | Mode | Lifecycle | CSS | When to use |
|---|------|-----------|-----|-------------|
| A | **Custom Element + `vrComponent`** | Own `connectedCallback` (auto) | `adoptedStyleSheets` via vrComponent | App root, route panels, modals |
| B | **Functional Component (plain fn)** | Inherited from parent CE | External — loaded by parent | List items, card grids, reusable UI |
| C | **CE + external `.template.html`** | Own `connectedCallback` (auto) | `adoptedStyleSheets` via vrComponent | Large views, designer-handoff HTML |

---

### 5A — Custom Element with `vrComponent` (Pattern CustomElement vrComponent)

```js
import { vrComponent, html } from '../../core/index.js';

class App extends HTMLElement {
  static {
    vrComponent(this, {
      tag: 'app-root',
      css: import.meta.url,   // resolves _App.js → _App.css
    });
  }

  // Auto-resolved as @click handler (via _scope = this)
  handleDelete(id) { store.state.todos = store.state.todos.filter(t => t.id !== id); }

  // Auto-called each render cycle → _context
  context() {
    return { title: store.state.title, todos: store.state.todos };
  }

  // Auto-called each render cycle → returns TemplateResult
  render(ctx) {
    return html`
      <h1>{{ title }}</h1>
      <for each="todo in todos">
        <article>
          <span>{{ todo.title }}</span>
          <button @click="handleDelete(todo.id)">✕</button>
        </article>
      </for>
    `;
  }
}
```

**Rules:**
1. NO inline styles, NO CSS classes — `[data-part="..."]` only.
2. `vrComponent()` in `static {}` handles `define()`, CSS, reactive effect.
3. Methods on the class are auto-resolved as `@click` handlers.
4. `context()` returns data for `{{ }}`. Called each render cycle.
5. `render(ctx)` returns `html\`\`` TemplateResult.
6. `vrComponent` automatically sets `result._scope = this` and `result._context = ctx`.

---

### 5B — Functional Component (Pattern Functional Component)

```js
import { html } from '../../core/index.js';

// Handler functions (one line of _scope at the end)
const handleSave = (id) => store.toggle(id);

// Pure function: receives data, returns TemplateResult
export function TodoList(ctx) {
  const result = html`
    <for each="todo in ctx.todos">
      <article>
        <h3>{{ todo.title | upper }}</h3>
        <button @click="handleSave(todo.id)">Toggle</button>
      </article>
    </for>
  `;
  result._scope = { handleSave };   // ← one explicit line
  result._context = ctx;
  return result;
}
```

**Rules:**
1. Plain function (no class, no HTMLElement). No lifecycle of its own.
2. Must set `result._scope` for `@click` handlers.
3. **Composition:** call inside a parent template via `{{ TodoList(todos) }}`
   (see §5.4 below). Pass functions via `_scope`, data via `_context`.
4. CSS lives in the parent CE or global — no `adoptedStyleSheets`.

**When to use:** reusable UI blocks (cards, list items, form sections).

---

### 5C — Custom Element with External HTML Template (Pattern CustomElement vrComponent with External HTML)

```js
import { vrComponent, html, render } from '../../core/index.js';

// Load external .template.html at module scope
const templateStr = await (
  await fetch(new URL('./_ProfileCard.template.html', import.meta.url))
).text();
const TEMPLATE = html(templateStr);   // html() accepts strings too

class ProfileCard extends HTMLElement {
  static {
    vrComponent(this, {
      tag: 'profile-card',
      css: import.meta.url,
    });
  }

  handleToggle(id) { store.toggle(id); }

  context() {
    return { name: store.state.name, todos: store.state.todos };
  }

  render(ctx) {
    const result = TEMPLATE;
    result._context = ctx;
    result._scope = this;    // method-based handlers
    return result;
  }
}
```

**Template file** (`_ProfileCard.template.html`) uses only `{{ }}`, `<for>`, `<if>`,
`<elseif>`, `<switch>`:
```html
<section data-part="profile-card">
  <h2>{{ name | upper }}</h2>
  <for each="todo in todos">
    <article data-state-done="{{ todo.done }}">
      <span>{{ todo.title }}</span>
      <switch expr="todo.done">
        <case result="true">✅ Done</case>
        <default>⏳ Pending</default>
      </switch>
      <button @click="handleToggle(todo.id)">Toggle</button>
    </article>
  </for>
  <if condition="todos.length === 0">
    <p>No todos.</p>
  <else>
    <p>{{ todos.length }} items</p>
  </if>
</section>
```

**Rules:**
1. Template file uses ONLY `{{ }}`, `<for>`, `<if>`, `@event="handler"`.
2. NO `${}` in template files — that is valid only in JS files.
3. Use `@click="handler"` (string) not `@click=${\handler\}`.
4. vrComponent auto-sets `result._scope = this` for method resolution.
5. Functions passed from Pattern CustomElement vrComponent (ext. HTML) → Pattern Functional Component go in `_context` (not `_scope`).

---

### Composition

`{{ FnName(args) }}` calls a function that returns `TemplateResult`.
Functions must be resolvable through the standard chain:

```
1. result._scope[name]       ← explicit scope
2. result._context[name]     ← data context (preferred for Pattern CustomElement vrComponent (ext. HTML) → Pattern Functional Component)
3. component instance[name]  ← CE methods (auto by vrComponent)
```

Custom Elements are composed via HTML tags, NOT `{{ }}`:
```html
<profile-card></profile-card>   ← native CE from registry
```

---

## Reference

See references/REFERENCE.md for data flow, bootstrap sequence, pitfalls, migration guide, guardrails, scaffolding, forms, and file structure.
