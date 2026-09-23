---
name: rule-frontend-vanilla-reactive
description: >-
  Use when building reactive web UIs without frameworks. Covers Proxy-based Store, Signals, html`` tagged templates, custom elements, and adoptedStyleSheets.
tags:
  - "frontend"
  - "vanilla"
  - "reactive"
frameworks: [vanilla]
guardrails:
  [
    vanilla-adopted-stylesheets,
    vanilla-ce-extends,
    vanilla-fn-component,
    vanilla-fn-no-register,
    vanilla-html-template,
    vanilla-mount-guard,
    vanilla-no-dollar-braces,
    vanilla-template-data-part,
    vanilla-template-load,
  ]
---

# rule-frontend-vanilla-reactive

Complete vanilla JS reactive framework pattern.
Zero framework dependencies. No build step required.

Full working example: see `examples/` in this skill directory.

## Architecture Overview

```
Store (Proxy)  →  tickState (Signal bridge)  →  Signals (State/Computed)
  →  EffectCollector  →  Scheduler (microtask)  →  Template Engine  →  DOM
```

**Core insight:** No virtual DOM. Plain functions return `html` template results.
Two expression systems: `${value}` for JS values, `{{ expr }}` for template expressions with filter pipes.

---

## 1. Store - Proxy-based State Container

### API Reference

```js
import { Store } from "./core/store/index.js";

const store = new Store(initialState, options);
store.state; // Proxy-wrapped state tree (mutate directly)
store.get(path); // Read by dot-path
store.set(path, value); // Write by dot-path
store.update(path, fn); // (current) => next
store.replace(nextState); // Replace entire tree
store.snapshot(); // Deep-cloned snapshot
```

### Key Rules

1. **Mutate directly** on `store.state`: `store.state.todos[0].title = "x"` - Proxy traps handle change events.
2. **Replace arrays/objects** immutably: `store.state.todos = [...store.state.todos, newTodo]`.
3. **`store.replace()`** doesn't trigger per-field traps - bump tickState manually after.
4. **Never pass raw proxy references** outside the store. Use `deepClone` for exports.
5. **Change events** emit `store:change` CustomEvent with `{ path, oldValue, newValue }`.

### Files (in `core/store/`)

| File         | Export                         | Purpose                                |
| ------------ | ------------------------------ | -------------------------------------- |
| `_store.js`  | `Store`                        | Proxy-based state container            |
| `_clone.js`  | `deepClone`, `clonePlainValue` | Handles Date, RegExp, Map, Set, arrays |
| `_guards.js` | `isObject`                     | Type guard                             |
| `_paths.js`  | `toPathArray`, `pathToString`  | Path utilities                         |

Full source: `examples/src/core/store/`

---

## 2. Signals - Fine-grained Reactivity

### API Reference

```js
import { Signal, effect } from "./core/signals/index.js";

// State signal
const count = new Signal.State(0);
count.get(); // → 0 (tracks dependency in active collector)
count.set(5); // notifies subscribers (unless equal)
count.peek(); // read without tracking

// Computed signal (lazy, derived)
const doubled = new Signal.Computed(() => count.get() * 2);
doubled.get(); // → 10 (lazy evaluate if dirty)

// Effect (auto-track + re-run on change)
const dispose = effect(() => {
  console.log(count.get());
});
dispose(); // stop the effect

// Untracked reads inside effects
Signal.subtle.untrack(() => {
  console.log(count.peek());
});
```

### Files (in `core/signals/`)

| File                    | Export                              | Lines                                            |
| ----------------------- | ----------------------------------- | ------------------------------------------------ |
| `_base-signal.js`       | `BaseSignal`                        | subscribe, track, notify                         |
| `_state-signal.js`      | `StateSignal`                       | get, set, peek with equality check               |
| `_computed-signal.js`   | `ComputedSignal`                    | lazy eval, dirty tracking, dependency collection |
| `_collector-context.js` | `withCollector`, `withoutCollector` | Stack-based tracking context                     |
| `_effect-collector.js`  | `EffectCollector`                   | Auto-track + dynamic resubscription              |
| `_scheduler.js`         | `schedule`                          | Microtask-batched effect scheduling              |
| `index.js`              | `Signal`, `effect`, `isSignalLike`  | Unified exports                                  |

### Key Rules

1. **`get()`** triggers `track()` - registers dependency in active collector.
2. **`set()`** triggers `notify()` if value changed (custom `equals` fn).
3. **ComputedSignal** is lazy - only re-evaluates on `get()` when dirty.
4. **Effects** automatically re-collect dependencies on every run (dynamic graph).
5. **Scheduler** batches by Set identity + microtask - multiple invalidations collapse to one run.
6. **`peek()`** reads without tracking. Use inside effects when you need a value without subscribing.

---

## 3. The "TickState" Bridge Pattern

```js
const tickState = new Signal.State(0, { equals: () => false });
```

**Always use `equals: () => false`** - every store write must notify.

### Wiring

```js
window.addEventListener("store:change", () => {
  tickState.set(performance.now());
});
```

### Why This Works

- **Store is the truth**, signals are the notification mechanism.
- Every computed that reads `store.state.X` MUST also read `tickState.get()`.
- Computed signals still cache - if value didn't change, downstream not invalidated.
- For large apps (>10k reactive nodes), consider path-based selective invalidation.

### Key Rules

1. **Always use `equals: () => false`** - every store write must notify.
2. **Every computed reading `store.state.X` MUST also read `tickState.get()`**.
3. **Two effects** typically read tickState: one for rendering, one for document-level side effects.

---

## 4. Template Engine

### API Reference

```js
import { html, render, directive, model, registerFilter } from "./core/template-engine/index.js";

// html tagged template (NOT a real tag - packages strings + values)
const result = html`<h1>{{ title | upper }}</h1>`;

// render into container
render(result, document.getElementById("app"));

// Register a filter
registerFilter("upper", (v) => String(v).toUpperCase());

// Two-way binding
html`<input
  model=${{
    signal: tickState,
    get: () => store.state.name,
    set: (v) => {
      store.state.name = v;
    },
  }}
/>`;
```

### Expression Systems

| Syntax                  | Part Type     | Behavior                             | Example                       |
| ----------------------- | ------------- | ------------------------------------ | ----------------------------- |
| `${expr}`               | ChildNodePart | JS value (handler, signal, iterable) | `<p>${name}</p>`              |
| `{{ expr }}`            | ExprPart      | Data expression with filter pipes    | `<p>{{ title \| upper }}</p>` |
| `attr=${expr}`          | AttributePart | HTML attribute from JS               | `<div class=${cls}>`          |
| `attr={{ expr }}`       | AttributePart | HTML attribute from context          | `<div class="{{ cls }}">`     |
| `.prop=${expr}`         | PropertyPart  | DOM property                         | `<input .value=${val}>`       |
| `@event=${fn}`          | EventPart     | Event listener                       | `<button @click=${fn}>`       |
| `model=${expr}`         | AttributePart | Two-way binding                      | `<input model=${m}>`          |
| `<for each="x in xs">`  | ForPart       | Loop (inline or component)           | `<for each="todo in todos">`  |
| `<if condition="expr">` | IfPart        | Conditional                          | `<if condition="done">`       |
| `<switch expr="x">`     | SwitchPart    | Multi-way branch                     | `<switch expr="status">`      |

### Built-in Filters

`upper`, `lower`, `capitalize`, `slugify`, `slug`, `trim`, `escapeHtml`,
`striptags`, `raw`, `json`, `default`, `truncate`, `length`, `first`, `last`,
`join`, `tagLabel`, `tagHref`, `date`, `timeAgo`, `urlencode`, `sortBy`

### Data Context Flow

Components receive a context object. Attach it to the result:

```js
const ctx = { title: "Hello", todos: [...] };
const result = App.render(ctx);
result._context = ctx; // enables {{ }} expression resolution
render(result, root);
```

### Files (in `core/template-engine/`)

| File                    | Export                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| `_template.js`          | `render()`                                                             |
| `_template-instance.js` | `TemplateInstance`, `getTemplate` (parser with `{{ }}`/`<for>`/`<if>`) |
| `_expression-parser.js` | `parseExpression`, `evaluateExpression`                                |
| `_filters.js`           | `registerFilter`, `FILTERS`, built-in filters (18 filters)             |
| `_template-helpers.js`  | `html`, `directive`, `model`, `isDirective`                            |
| `_child-node-part.js`   | ChildNodePart (text, template, iterable, signal)                       |
| `_attribute-part.js`    | AttributePart + model directive                                        |
| `_expr-part.js`         | ExprPart (`{{ }}` interpolation with filters)                          |
| `_for-part.js`          | ForPart (`<for>` directive, keyed reconciliation)                      |
| `_if-part.js`           | IfPart (`<if>` directive, signal support)                              |
| `_event-part.js`        | EventPart                                                              |
| `_property-part.js`     | PropertyPart                                                           |
| `_range.js`             | `clearRange`, `moveRangeBefore`                                        |

Full source: `examples/src/core/template-engine/`

---

## 5. Component Pattern (Custom Elements + adoptedStyleSheets)

### Pattern

Every component is a class extending `HTMLElement`:

```js
import { html } from "../../core/index.js";

// CSS loaded once at module scope
const cssText = await (await fetch(new URL("./_TodoItem.css", import.meta.url))).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export class TodoItem extends HTMLElement {
  static {
    customElements.define("todo-item", this);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }

  static render(todo) {
    return html`
      <article data-part="item" data-state-completed="${todo.completed ? "done" : ""}">
        <input type="checkbox" data-part="toggle" />
        <span data-part="title">{{ todo.title | upper }}</span>
        <button data-part="delete" @click=${() => removeTodo(todo.id)}>Delete</button>
      </article>
    `;
  }
}
```

### Rules

1. **NO inline styles** - `style="..."` is forbidden in templates.
2. **NO CSS classes** - use element selectors + `[data-part="..."]`.
3. **`static {}` block** for `customElements.define()` + `adoptedStyleSheets`.
4. **`static render(item)`** used by `${Component(item)}` inside `<for>`.
5. **Data flows through context** - components receive context as argument.

---

## 6. Data Flow Summary

### Complete Tick→DOM Path

```
1. User input → model binding setter
2. Store proxy trap → store:change event
3. store:change listener → tickState.set(performance.now())
4. tickState.notify() → invalidate computeds + schedule effects
5. Microtask flush → render effect runs
6. TemplateInstance.updateWithContext(values, context)
7. Parts write directly to DOM (ChildNodePart, ExprPart, ForPart, etc.)
```

### Synchronous vs Microtask

| Phase     | When                   | What runs                                                     |
| --------- | ---------------------- | ------------------------------------------------------------- |
| Sync      | During tickState.set() | Model binding syncs, computed invalidation, effect scheduling |
| Microtask | After current script   | Effects (render, document sync)                               |

---

## 7. Complete Bootstrap Sequence

```js
// 1. Create store
const store = new Store(initialState);

// 2. Create tickState bridge
const tickState = new Signal.State(0, { equals: () => false });
window.addEventListener("store:change", () => tickState.set(performance.now()));

// 3. Register filters
registerFilter('upper', v => String(v).toUpperCase());

// 4. Load component CSS (top-level await)
const sheet = new CSSStyleSheet();
sheet.replaceSync(await (await fetch(new URL('./_App.css', import.meta.url))).text());

// 5. Define components with static {} blocks

// 6. Create render context (ComputedSignal)
const renderContext = new Signal.Computed(() => {
  tickState.get();
  return { title: store.state.title, todos: store.state.todos, ... };
});

// 7. Mount effect
effect(() => {
  const ctx = renderContext.get();
  const result = App.render(ctx);
  result._context = ctx;
  render(result, root);
});

// 8. Initial render kick
tickState.set(performance.now());
```

---

## 8. File Structure Convention

```
src/
  index.html
  index.js                              ← Entry point
  core/
    index.js                            ← Unified exports
    signals/                            ← Signal system
    store/                              ← Proxy Store
    template-engine/                    ← Template engine
  components/
    App/
      index.js                          ← Barrel
      _App.js                           ← Component (_PascalCase.js)
      _App.css                          ← External CSS
    TodoItem/
      index.js
      _TodoItem.js
      _TodoItem.css
  helpers/
    index.js
    actions/                            ← Store mutation functions
    computed/                           ← ComputedSignal factories
    shared/                             ← Shared singletons (store, tickState)
  styles/
    index.css
    _base.css
    _components.css
```

---

## 9. Pitfalls and Common Mistakes

### 1. Forgetting `tickState.get()` in computed signals

```js
// WRONG - won't re-evaluate on store changes:
const myComputed = new Signal.Computed(() => store.state.todos.length);
// RIGHT:
const myComputed = new Signal.Computed(() => {
  tickState.get();
  return store.state.todos.length;
});
```

### 2. Forgetting `result._context`

```js
// WRONG - {{ }} expressions have no data:
effect(() => {
  render(App.render(ctx), root);
});
// RIGHT:
effect(() => {
  const result = App.render(ctx);
  result._context = ctx;
  render(result, root);
});
```

### 3. `{{ }}` vs `${}` confusion

- `{{ }}` → DATA expressions (context + filters): `{{ title | upper }}`
- `${}` → JS values (handlers, directives): `@click=${fn}`, `model=${config}`

### 4. Context must be a plain object - pass `signal.get()`, not the signal itself.

### 5. Effect cleanup - `effect()` returns a disposer. Call when component unmounts.

### 6. Duplicate keys in `<for>` - each item needs unique `id` or stable identity.

---

## 10. Migration Guide Cheatsheet

### React → Pix

| React             | Vanilla Equivalent           |
| ----------------- | ---------------------------- |
| `useState`        | `new Signal.State()`         |
| `useMemo`         | `new Signal.Computed()`      |
| `useEffect`       | `effect()`                   |
| setState          | `store.state.X = Y`          |
| JSX               | `` html`...` ``              |
| key prop          | `<for>` keyed reconciliation |
| Controlled inputs | `model={...}` directive      |
| React Context     | Shared `store` import        |

### Vue → Pix / Svelte → Pix

See `patterns.md` in this directory for full migration tables.

---

## Guardrails

Run `pix_frontend_vanilla_reactive` mode=check to validate code against these rules.
Use `rule_tool_check` tool for automated guardrail checking.

Key assertions enforced by guardrails engine:

- **no-css-classes**: CSS uses element + `[data-part]` selectors only
- **no-inline-styles**: Templates have zero `style="..."`
- **semantic-html**: No `<div>` where semantic element exists
- **external-css**: CSS via `fetch → CSSStyleSheet.replaceSync → adoptedStyleSheets`
- **custom-element**: Component extends `HTMLElement` with `static {}` block
- **html-template**: Component uses `html\`\`` tagged template
- **store-proxy**: Store uses Proxy with `store:change` events
- **tickstate-bridge**: Computed signals read `tickState.get()`
- **data-part**: Child elements use `data-part="role"` attributes
- **template-syntax**: `{{ expr }}` for data, `${value}` for JS values
- **jsdoc-required**: Every JS/TS file MUST have complete JSDoc on all exported symbols (see rule-styleguide → javascript.md)
- **css-comments-required**: Every CSS file MUST have file-level + section comments (see rule-styleguide → css.md)
- **a11y-test-required**: Every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` (see rule-styleguide → a11y.md → Automated Testing)

## Project Scaffolding

All rule projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) → Project Scaffolding.
Use `rule_tool_styleguide mode=scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
`.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

Iterate: `generate → rule_tool_check → fix → rule_tool_check → all pass`.

---

## Forms (Vanilla Reactive)

### Prerequisites

- Use the rule reactive Store for form state
- Validate with `zod` schemas
- Pure HTML/Custom Elements

### Form store with validation

```javascript
import { z } from "zod";
import { Store } from "../core/store/index.js";

const contactSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(255),
});

export const formStore = new Store({
  email: "",
  name: "",
  errors: {},
  isSubmitting: false,
});

export async function submitForm() {
  const data = formStore.get();
  const result = contactSchema.safeParse(data);
  if (!result.success) {
    const errors = {};
    result.error.issues.forEach((issue) => {
      errors[issue.path[0]] = issue.message;
    });
    formStore.set({ errors });
    return;
  }
  formStore.set({ isSubmitting: true });
  try {
    await api.post("/contact", result.data);
  } finally {
    formStore.set({ isSubmitting: false });
  }
}
```

### Form component

```javascript
import { formStore, submitForm } from "../../store/form.store.js";

export class ContactForm extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <form data-part="form">
        <label data-part="field">
          <span data-part="label">Email</span>
          <input data-part="input" type="email" data-bind="email" />
          <span data-part="error" data-error="email"></span>
        </label>
        <button data-part="submit" type="submit">Send</button>
      </form>
    `;
    this.bindInputs();
    this.querySelector("[data-part=form]").addEventListener("submit", (e) => {
      e.preventDefault();
      submitForm();
    });
    formStore.subscribe(() => this.render());
  }

  bindInputs() {
    this.querySelectorAll("[data-bind]").forEach((el) => {
      el.addEventListener("input", () => formStore.set({ [el.dataset.bind]: el.value }));
    });
  }

  render() {
    const s = formStore.get();
    this.querySelector("[data-part=submit]").disabled = s.isSubmitting;
    for (const [k, msg] of Object.entries(s.errors)) {
      const el = this.querySelector(`[data-error="${k}"]`);
      if (el) el.textContent = msg;
    }
  }
}
customElements.define("contact-form", ContactForm);
```

### Checklist

- [ ] Store-based form state management
- [ ] `zod` schema validation
- [ ] `data-bind` for input binding
- [ ] `data-error` for field-level error display

---

## Forms (Vanilla Reactive)

### Prerequisites

- Use the rule reactive Store for form state
- Use native HTML5 validation + custom validation functions
- Pure JavaScript - no Zod, no external validation library
- Custom Elements with Store subscriptions

### Step 1 - Validation functions (pure JS)

```javascript
export const validators = {
  required: (value) => (value?.trim()?.length > 0 ? null : "This field is required"),
  email: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "Invalid email"),
  minLength: (min) => (value) => (value?.length >= min ? null : `Minimum ${min} characters`),
  compose:
    (...fns) =>
    (value) => {
      for (const fn of fns) {
        const e = fn(value);
        if (e) return e;
      }
      return null;
    },
};

export function validate(schema, data) {
  const errors = {};
  for (const [field, fns] of Object.entries(schema)) {
    for (const fn of [].concat(fns)) {
      const e = fn(data[field]);
      if (e) {
        errors[field] = e;
        break;
      }
    }
  }
  return Object.keys(errors).length ? errors : null;
}
```

### Step 2 - Form store

```javascript
import { Store } from "../core/store/index.js";
import { validators, validate } from "./validation.js";

const schema = { email: [validators.required, validators.email], name: [validators.required] };

export const formStore = new Store({ email: "", name: "", errors: null, isSubmitting: false });

export async function submitForm() {
  const data = formStore.get();
  const errors = validate(schema, data);
  if (errors) {
    formStore.set({ errors });
    return;
  }
  formStore.set({ isSubmitting: true, errors: null });
  try {
    await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    formStore.set({ email: "", name: "", isSubmitting: false });
  } catch (err) {
    formStore.set({ errors: { form: err.message }, isSubmitting: false });
  }
}
```

### Step 3 - Form component

```javascript
import { formStore, submitForm } from "../../store/form.store.js";

const template = document.createElement("template");
template.innerHTML = `
  <form data-part="form" novalidate>
    <label data-part="field"><span data-part="label">Email</span>
      <input data-part="input" type="email" data-bind="email" />
      <span data-part="error" data-error="email" aria-live="polite"></span></label>
    <button data-part="submit" type="submit">Send</button>
  </form>`;

export class ContactForm extends HTMLElement {
  connectedCallback() {
    this.append(template.content.cloneNode(true));
    this.querySelector("[data-part=form]").addEventListener("submit", (e) => {
      e.preventDefault();
      submitForm();
    });
    this.querySelectorAll("[data-bind]").forEach((el) => el.addEventListener("input", () => formStore.set({ [el.dataset.bind]: el.value })));
    formStore.subscribe(() => {
      const s = formStore.get();
      const btn = this.querySelector("[data-part=submit]");
      btn.disabled = s.isSubmitting;
      btn.textContent = s.isSubmitting ? "Sending..." : "Send";
      this.querySelectorAll("[data-error]").forEach((el) => (el.textContent = ""));
      if (s.errors)
        for (const [k, msg] of Object.entries(s.errors)) {
          const el = this.querySelector(`[data-error="${k}"]`);
          if (el) el.textContent = msg;
        }
    });
  }
}
customElements.define("contact-form", ContactForm);
```

### Checklist

- [ ] Store-based form state management (no external libs)
- [ ] Pure JS validation functions
- [ ] HTML5 novalidate with custom validation
- [ ] aria-live for accessibility
- [ ] Submission guarded with isSubmitting

## See also

- [rule](../rule/SKILL.md) - Central skill index
