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

## Architecture Overview

```
Store (Proxy)  →  store.tick (auto-created Signal)  →  Signals (State/Computed)
  →  EffectCollector  →  Scheduler (microtask)  →  Template Engine  →  DOM
```

**Core insight:** No virtual DOM. Plain functions return `html` template results.
One expression system: `{{ expr }}` for data with filter pipes.
Events use `@click="handler(args)"` resolved from `_scope` (see §5).

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

## 6. Data Flow Summary

### Complete Tick→DOM Path

```
1. User input → @input handler → store.state.X = Y
2. Proxy trap fires → store.tick.set() (automatic)
3. Signal subscribers invalidate → ComputedSignal marks dirty
4. Microtask flush → render effect runs
5. TemplateInstance.updateWithContext(values, context)
6. Parts write directly to DOM (ChildNodePart, ExprPart, ForPart, etc.)
```

### Synchronous vs Microtask

| Phase | When | What runs |
|-------|------|-----------|
| Sync | During store.tick.set() | Model binding syncs, computed invalidation, effect scheduling |
| Microtask | After current script | Effects (render, document sync) |

---

## 7. Complete Bootstrap Sequence

```js
// 1. Store (auto-creates store.tick for reactivity)
const store = new Store({ title: 'Hello', todos: [] });

// 2. Register filters (optional)
registerFilter('upper', v => String(v).toUpperCase());

// 3. Define components — vrComponent handles CSS, context, effect, render
//    No manual tickState, no effect(), no store.tick.set() needed.

```

vrComponent resolves: `context()` → `render()` → DOM (all reactive via store.tick).

---

## 8. File Structure Convention

```
src/
  index.html
  index.js                              ← Entry point + filter registration
  core/
    index.js                            ← Unified re-exports
    signals/                            ← Signal system (State, Computed, effect)
    store/                              ← Proxy Store (auto-creates store.tick)
    template-engine/                    ← html, render, getTemplate, loadTemplate
      _load-template.js                 ← loadTemplate() helper
    dom-parts/                          ← DOMPart classes (EventPart, ForPart, …)
    decorator/
      _vr-component.js                  ← vrComponent() decorator
  styles/
    index.css
    _base.css
    _components.css
  apps/                                 ← Example apps (see Quickstart)
    vr-component/
      index.html, index.js, _App.js
    fn-component/
      index.html, index.js, _App.js
    vr-component-html/
      index.html, index.js, _App.js, _Card.template.html
    combo/
      index.html, index.js, _App.js
      components/TodoHeader/
        index.js, _TodoHeader.js, _TodoHeader.template.html
```

---

## 9. Pitfalls and Common Mistakes

### 1. Forgetting `store.tick.get()` in computed signals
```js
// WRONG — won't re-evaluate on store changes:
const myComputed = new Signal.Computed(() => store.state.todos.length);
// RIGHT:
const myComputed = new Signal.Computed(() => { store.tick.get(); return store.state.todos.length; });
```

### 2. Forgetting `result._context`
```js
// WRONG — {{ }} expressions have no data:
effect(() => { render(App.render(ctx), root); });
// RIGHT:
effect(() => { const result = App.render(ctx); result._context = ctx; render(result, root); });
```

### 3. Forgetting `result._scope`
```js
// WRONG — @click="handleSave" won't resolve:
effect(() => { render(App.render(ctx), root); });
// RIGHT:
effect(() => {
  const result = App.render(ctx);
  result._context = ctx;
  result._scope = { handleSave };   // or this for CE methods
  render(result, root);
});
```

### 4. Context must be a plain object — pass `signal.get()`, not the signal itself.

### 5. Effect cleanup — `effect()` returns a disposer. Call when component unmounts.

### 6. Duplicate keys in `<for>` — each item needs unique `id` or stable identity.

---

## 10. Migration Guide Cheatsheet

### React → Pix
| React | Vanilla Equivalent |
|-------|-------------------|
| `useState` | `new Signal.State()` |
| `useMemo` | `new Signal.Computed()` |
| `useEffect` | `effect()` |
| setState | `store.state.X = Y` |
| JSX | `` html`...` `` |
| key prop | `<for>` keyed reconciliation |
| Controlled inputs | `@input="handler($event)"` + `.value="{{ }}"` |
| onClick | `@click="handler(args)"` (resolved from `_scope`) |
| React Context | Shared `store` import |

### Vue → Pix / Svelte → Pix
See `patterns.md` in this directory for full migration tables.

---

## Guardrails

Run `pix_frontend_vanilla_reactive` mode=check to validate code against these rules.
Use `pix_check` tool for automated guardrail checking.

Key assertions enforced by guardrails engine:

### All patterns
- **no-css-classes**: CSS uses element + `[data-part]` selectors only
- **no-inline-styles**: Templates have zero `style="..."`
- **semantic-html**: No `<div>` where semantic element exists
- **external-css**: CSS via fetch → CSSStyleSheet.replaceSync → adoptedStyleSheets
- **store-proxy**: Store uses Proxy with `store:change` events
- **store-tick**: Computed signals read `store.tick.get()`
- **data-part**: Child elements use `data-part="role"` attributes
- **template-syntax**: `{{ expr }}` for data only (NO `${}`)
- **no-dollar-braces**: Templates must NOT contain `${}`
- **jsdoc-required**: Every JS/TS file MUST have complete JSDoc on all exported symbols
- **css-comments-required**: Every CSS file MUST have file-level + section comments
- **a11y-test-required**: Every project MUST have Playwright + @axe-core/playwright a11y tests

### Pattern CustomElement vrComponent (Custom Element + vrComponent)
- **vr-component**: `vrComponent(this, { tag, css })` called in `static {}` block
- **ce-extends**: Component extends `HTMLElement`
- **css-auto**: CSS loaded via vrComponent (import.meta.url or explicit path)
- **mount-guard**: vrComponent handles re-mount guard automatically

### Pattern Functional Component (Functional Component)
- **fn-component**: Component is a plain function, NOT a class
- **fn-returns-html**: Function returns `html\`\`` (`TemplateResult`)
- **fn-scope**: `result._scope` is set for `@click` handlers
- **fn-composable**: Function can be called inside `{{ Fn(ctx) }}`

### Pattern CustomElement vrComponent with External HTML (External HTML Template)
- **external-template**: Component loads template from `.template.html` file
- **no-dollar-braces**: Template files must NOT contain `${}`
- **click-string**: Events use `@click="handler"`, not `@click=${\fn\}`
- **template-data-part**: External template uses `data-part` selectors
- **template-css**: CSS loaded via vrComponent

## Project Scaffolding

All rule projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) → Project Scaffolding.
Use `pix_styleguide mode=scaffold` or `pix_scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
`.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

Iterate: `generate → pix_check → fix → pix_check → all pass`.

---

## Forms

Forms use the standard Store + `@input` + `@submit` pattern.
No special form store — just use the same Store as the rest of your app.

### Validation (pure JS)

```javascript
export const validators = {
  required: (v) => v?.trim()?.length > 0 ? null : "Required",
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Invalid email",
  minLength: (min) => (v) => v?.length >= min ? null : `Min ${min} chars`,
  compose: (...fns) => (v) => { for (const fn of fns) { const e = fn(v); if (e) return e; } return null; },
};
```

### Example: ContactForm with Pattern CustomElement vrComponent

```javascript
import { vrComponent, html, Store } from '../core/index.js';

const store = new Store({ email: '', name: '', errors: null, isSubmitting: false });
// store.tick auto-created — no manual tickState needed

// Validators (inline — no external dependency)
const required = v => v?.trim()?.length > 0 ? null : 'Required';
const email = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email';

class ContactForm extends HTMLElement {
  static { vrComponent(this, { tag: 'contact-form', css: import.meta.url }); }

  handleSubmit($event) {
    $event.preventDefault();
    const data = { email: store.state.email, name: store.state.name };
    const errors = {};
    if (required(data.email)) errors.email = required(data.email);
    else if (email(data.email)) errors.email = email(data.email);
    if (required(data.name)) errors.name = required(data.name);
    if (Object.keys(errors).length) { store.state.errors = errors; return; }
    store.state.isSubmitting = true;
    fetch('/api/contact', { method: 'POST', body: JSON.stringify(data) })
      .then(() => { store.state.email = ''; store.state.name = ''; store.state.errors = null; })
      .catch((e) => { store.state.errors = { form: e.message }; })
      .finally(() => { store.state.isSubmitting = false; });
  }

  handleNameInput($event) { store.state.name = $event.target.value; }
  handleEmailInput($event) { store.state.email = $event.target.value; }

  context() {
    return { email: store.state.email, name: store.state.name,
             errors: store.state.errors, isSubmitting: store.state.isSubmitting };
  }

  render(ctx) {
    return html`
      <form @submit="handleSubmit($event)" data-part="form" novalidate>
        <label data-part="field">
          <span data-part="label">Email</span>
          <input .value="{{ email }}" @input="handleEmailInput($event)" type="email" data-part="input" />
          <span data-part="error" aria-live="polite">{{ errors.email }}</span>
        </label>
        <label data-part="field">
          <span data-part="label">Name</span>
          <input .value="{{ name }}" @input="handleNameInput($event)" data-part="input" />
          <span data-part="error" aria-live="polite">{{ errors.name }}</span>
        </label>
        <button type="submit" data-part="submit" disabled="{{ isSubmitting }}">
          {{ isSubmitting ? 'Sending...' : 'Send' }}
        </button>
        <if condition="errors.form">
          <p data-part="form-error">{{ errors.form }}</p>
        </if>
      </form>
    `;
  }
}
```

**Key points:**
- Use `.value="{{ }}"` + `@input="handler($event)"` for controlled inputs
- No `model` directive — use `@submit="handler($event)"`
- Validation errors are part of the store — read via `{{ errors.email }}`
- Submit state via `{{ isSubmitting }}`

## See also

- [rule](../rule/SKILL.md) — Central skill index
