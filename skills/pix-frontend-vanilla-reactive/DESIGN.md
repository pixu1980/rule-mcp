# Design: Three Component Modes for rule-frontend-vanilla-reactive

> **Status**: ✅ **Implementation complete.** This document captures the design decisions
> that led to the v2 engine. The implementation is in `core/` and examples in `examples/`.
> See `SKILL.md` for usage and `core/ARCHITECTURE.md` for architecture reference.
>
> **Scope**: `~/Projects/pixu1980/rule-mcp` → `rule` → `rule` (porting)
> **Date**: 2026-07-17 (design), 2026-07-19 (completed)
> **Author**: rule-mcp maintainer

---

## 1. Problem Statement

The `rule-frontend-vanilla-reactive` skill currently documents **one** component
pattern — Custom Elements with `static render()` returning `html\`\`` tagged
templates. This is insufficient for real-world vanilla-reactive applications
which need three distinct authoring modes:

| # | Mode | Existing? | Where? |
|---|------|-----------|--------|
| A | **Custom Element with `html\`\`` in `render()`** | ✅ Documented | `_App.js`, SKILL.md §5 |
| B | **Functional Component — plain function returning `html\`\``** | ❌ Missing | Only ad-hoc in `interview.js` (CE wrapping, not pure) |
| C | **Custom Element with external `.template.html` file** | ❌ Missing | `_MtgApp.template.html` (+ others) use Parcel `bundle-text` but bypass the template engine entirely |

---

## 2. Current Architecture

### 2.1 The reactive pipeline (working)

```
Store (Proxy)  →  store:change event  →  tickState.set()
  →  Signal.State.notify()  →  ComputedSignal invalidate  →  microtask scheduler
  →  effect()  →  App.render(ctx) → html`...``
  →  render(result, container)  →  TemplateInstance.updateWithContext(values, ctx)
  →  DOMParts write to live DOM
```

### 2.2 What `html` does

```js
export function html(strings, ...values) {
  return { kind: 'template-result', strings, values };
}
```

Zero magic. A plain object with `{ strings: TemplateStringsArray, values: Array }`.
The `render()` function passes this to `new TemplateInstance(strings)` which:

1. Calls `getTemplate(strings)` — builds full HTML markup, replaces `${}` with
   `<!--val:N-->`, `<for>`/`<if>` with `<!--dir:N-->`, `{{ }}` with `<!--expr:N-->` markers
2. Creates `<template>` element and parses the markup
3. Walks the DOM tree, finds all markers, creates DOMParts for each
4. `updateWithContext(values, context)` — pushes `${}` values into `ChildNodePart`,
   evaluates `{{ }}` expressions via `evaluateExpression(parsed, context)`,
   renders `<for>` and `<if>` directives

### 2.3 The gap

The pipeline works ONLY with `html\`\`` tagged templates. There is no way to:

- **Pattern B**: Define a pure function `(ctx) => html\`\`` that returns a
  `TemplateResult` and can be composed inside a parent CE's render cycle.
  The `interview.js` uses functions like `renderForm()` but they return
  **innerHTML strings**, not `TemplateResult` objects — losing reactive updates.

- **Pattern C**: Parse a raw HTML string (from an external file) into a
  `TemplateInstance` with `{{ }}`, `<for>`, `<if>` support. The `_MtgApp.template.html`
  files load HTML via `import template from "bundle-text:./file.html"` (Parcel) or
  `fetch()` but then bypass the template engine entirely, using `innerHTML` and
  manual DOM queries — losing reactive updates.

---

## 3. Pattern A: Custom Element with `html\`\`` (existing — needs polish only)

### 3.1 What works

```js
class App extends HTMLElement {
  static { customElements.define('app-root', this); /* + adoptedStyleSheets */ }
  static render(ctx) { return html`<h1>{{ title }}</h1>`; }
  connectedCallback() {
    effect(() => {
      const ctx = renderContext.get();
      const result = App.render(ctx);
      result._context = ctx;
      render(result, this);
    });
  }
}
```

### 3.2 What needs fixing

| Issue | Fix |
|-------|-----|
| `effect()` + `render()` boilerplate repeated in every CE | Extract into a `bindElement(el, context, renderFn)` helper |
| `result._context = ctx` is a manual step easily forgotten | Make `render()` accept context: `render(result, container, context)` |
| Static CSS loading via top-level `await fetch` is fragile | Document `CSSStyleSheet` pattern more clearly with `loading="lazy"` |
| Missing re-render guard (double `connectedCallback`) | Document/dispatch `_isMounted` pattern as mandatory |

### 3.3 Proposed helper

```js
// helpers/_bindElement.js
export function bindElement(element, store, tickState, renderFn) {
  let contextComputed;

  if (store && tickState) {
    // Reactive case: create a lazy computed from store
    contextComputed = new Signal.Computed(() => {
      tickState.get();
      return renderFn(store.state);
    });
  }

  let dispose;
  element._bindDispose = () => { if (dispose) dispose(); };

  function mount() {
    if (dispose) return; // already mounted
    dispose = effect(() => {
      const ctx = contextComputed
        ? contextComputed.get()
        : (typeof renderFn === 'function' ? {} : {});
      const result = typeof renderFn === 'function' ? renderFn(store?.state) : html``;
      if (result && result.kind === 'template-result') {
        result._context = ctx;
        render(result, element);
      }
    });
  }

  function unmount() { element._bindDispose(); dispose = null; }

  return { mount, unmount };
}
```

This eliminates the boilerplate from every component.

---

## 4. Pattern B: Functional Component (plain function returning `html\`\``)

### 4.1 Definition

A functional component is a **pure function** that takes a context/data object
and returns a `TemplateResult` (what `html\`\`` returns). It has:
- NO class, NO `extends HTMLElement`
- NO `connectedCallback`/`disconnectedCallback`
- NO `static {}` block
- NO `adoptedStyleSheets` (CSS lives in the parent CE or global)
- Lifecycle managed by the **parent Custom Element's `effect()`**

### 4.2 The pattern (from `interview.js` — already happening but undocumented)

The `interview.js` already uses functions like `renderForm()`, `renderSimple()`,
`renderDone()`, `renderChoiceCards()`, `renderField()`, `renderRepeatableGroup()`.
These are functional components in spirit — but they return **string concatenation**
(`""` + `<div>`) instead of `html\`\``. This means:

- `{{ }}` expressions are NOT reactive (they're evaluated once during string build)
- `<for>` and `<if>` directives are NOT processed
- Event handlers must use inline `onclick=...` instead of `@click=${fn}`
- No template engine optimization (template caching, part reuse)

### 4.3 The fix: real `html\`\`` functional components

```js
// Functional Component (no class, pure function)
function TodoList(ctx) {
  return html`
    <section data-part="list">
      <for each="todo in todos">
        <article data-part="card" data-state-done="{{ todo.done }}">
          <h3>{{ todo.title | upper }}</h3>
          <button @click=${() => ctx.actions.toggle(todo.id)}>Toggle</button>
        </article>
      </for>
      <if condition="todos.length === 0">
        <p data-part="empty">No todos yet.</p>
      </if>
    </section>
  `;
}

// Used FROM a Custom Element:
class App extends HTMLElement {
  static { customElements.define('app-root', this); }

  connectedCallback() {
    // The functional component is called inside the reactive effect
    effect(() => {
      tickState.get();
      const ctx = {
        todos: store.state.todos,
        filter: store.state.filter,
        actions: { toggle, remove, add },
      };
      const result = TodoList(ctx);
      result._context = ctx;
      render(result, this.querySelector('[data-part="main"]'));
    });
  }
}
```

### 4.4 Key differences vs. Pattern A

| Aspect | Custom Element | Functional Component |
|--------|---------------|---------------------|
| Scope | Entire DOM subtree | Partial template slot |
| Lifecycle | Own `connectedCallback` | Inherited from parent CE's `effect()` |
| CSS | `adoptedStyleSheets` in `static {}` | External — loaded by parent |
| `tickState.get()` | Inside own `connectedCallback` | Inside parent CE's effect |
| Reusability | Can be used standalone | Only inside a parent CE |
| Performance | Stable root, parts update | New `html\`\`` result each tick (but parts are the same) |
| Composition | Nested via `<for render=${}>` | Direct function call: `html\`...${SubComponent(ctx)}\`\`` |

### 4.5 When to use which

- Use **Pattern A (CE)** for the app root, route panels, modals, or any
  component that needs lifecycle isolation and self-contained CSS.
- Use **Pattern B (functional)** for list items, card grids, form sections,
  or any reusable piece of UI that doesn't need its own lifecycle or CSS scope.

### 4.6 Composition example

```js
// Functional component returns a TemplateResult
function ContactCard(contact) {
  return html`
    <article data-part="contact-card">
      <h3>{{ name }}</h3>
      <p>{{ email }}</p>
      <button @click=${() => onSelect(contact.id)}>Select</button>
    </article>
  `;
}

// Inside a CE's render:
static render(ctx) {
  return html`
    <section data-part="grid">
      <for each="c in contacts">
        ${ContactCard(c)}   ← functional component returns TemplateResult → ChildNodePart
      </for>
    </section>
  `;
}
```

This already works with the current template engine! `${expr}` inside `html\`\``
is handled by `ChildNodePart.setValue()` which accepts a `TemplateResult` object.
The engine creates a nested `TemplateInstance` and renders it in place.

The gap is only **documentation** — developers don't know this is possible.

---

## 5. Pattern C: Custom Element with External HTML Template File

### 5.1 What exists

The `mtg-maniac` project uses a pattern:

```js
import template from "bundle-text:./_MtgApp.template.html";

export class MtgApp extends HTMLElement {
  connectedCallback() {
    const tpl = document.createElement("template");
    tpl.innerHTML = template;
    this.replaceChildren(tpl.content.cloneNode(true));
    // Then manually query elements and attach behaviors
  }
}
```

The `.template.html` file contains full semantic HTML (not using Pix template
syntax — no `{{ }}`, no `<for>`, no `<if>`). All data binding is manual:
`this.querySelector("#...").textContent = value`.

### 5.2 What's missing

1. **Template engine integration** — the external HTML should support
   Pix template syntax (`{{ expr | filter }}`, `<for>`, `<if>`, `@click`)
2. **Reactive updates** — no `innerHTML` clobbering, use DOMParts
3. **CSS integration** — `adoptedStyleSheets` with the external CSS

### 5.3 The engine change needed

The current `getTemplate(strings)` requires a `TemplateStringsArray` from
`html\`\``. We need a new entry point that accepts **raw HTML strings**:

```js
// NEW: parse an HTML string with Pix template syntax
// Used when loading from .template.html files
export function parseTemplate(htmlString) {
  // Like getTemplate() but:
  // - NO `${}` processing (no <!--val:N--> markers)
  // - NO __attr_N__ markers for attribute slots
  // - ONLY {{ expr }} processing + <for>/<if> directives
  // - Creates TemplateInstance that can be updated via updateWithContext

  // This is essentially getTemplate() called with a synthetic TemplateStringsArray
  // where strings = [htmlString] and there are NO ${} values
  const strings = Object.freeze([htmlString]);
  return new TemplateInstance(strings);
}
```

Wait — this already works! `html` returns `{ strings: [htmlString], values: [] }`.
But the problem is `html\`\`` is a tagged template literal — it can't be called
with a runtime string.

**Actual implementation needed:**

```js
// NEW in _template-helpers.js
export function htmlFromString(htmlString) {
  return { kind: 'template-result', strings: [htmlString], values: [] };
}
```

But this fails in `getTemplate()` because the first phase iterates
`strings.length - 1` which is 0 (no interpolations), producing markup identical
to the original string. The `{{ }}`, `<for>`, `<if>` processing steps are the
same. So this works perfectly.

### 5.4 The full external template pattern

```js
// components/ContactList/_ContactList.js
// ── CSS ──────────────────────────────────────
const cssText = await (await fetch(new URL('./_ContactList.css', import.meta.url))).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

// ── Load external HTML template ──────────────
// Option A: Parcel bundle-text (build-time)
import templateStr from "bundle-text:./_ContactList.template.html";

// Option B: Runtime fetch (no build tool needed)
// const templateStr = await (await fetch(new URL('./_ContactList.template.html', import.meta.url))).text();

// ── Parse into template result ───────────────
// [NEW] htmlFromString converts raw HTML to a TemplateResult
import { htmlFromString, render, effect } from '../../core/index.js';

// This is a one-time parse (cached in getTemplate via WeakMap on the string)
const TEMPLATE = htmlFromString(templateStr);

// ── Component ────────────────────────────────
export class ContactList extends HTMLElement {
  static {
    customElements.define('contact-list', this);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }

  connectedCallback() {
    effect(() => {
      tickState.get();
      const ctx = { contacts: store.state.contacts, filter: store.state.filter };
      // Same render pipeline — template engine handles {{}}, <for>, <if>
      const result = TEMPLATE;
      result._context = ctx;
      render(result, this);
    });
  }
}
```

### 5.5 Template file syntax (`_ContactList.template.html`)

```html
<!--
  Pix vanilla-reactive template.
  Supports {{ expr | filter }}, <for>, <if>, @events.
  Uses data-part selectors only — no CSS classes.
-->
<section data-part="contact-list">
  <header data-part="header">
    <h2>{{ title }}</h2>
  </header>

  <for each="c in contacts">
    <article data-part="card" data-state-selected="{{ c.selected }}">
      <img data-part="avatar" src="{{ c.avatar }}" alt="" />
      <h3 data-part="name">{{ c.name }}</h3>
      <p data-part="email">{{ c.email }}</p>
      <button data-part="delete" @click=${() => store.state.contacts = store.state.contacts.filter(x => x.id !== c.id)}>
        Delete
      </button>
    </article>
  </for>

  <if condition="contacts.length === 0">
    <p data-part="empty-state">No contacts match your filter.</p>
  </if>
</section>
```

### 5.6 Engine changes needed

| Change | File | Impact |
|--------|------|--------|
| Add `htmlFromString(str)` helper | `_template-helpers.js` | Creates `{ kind: 'template-result', strings: [str], values: [] }` |
| Fix `getTemplate()` for single-string no-interpolation case | `_template-instance.js` | The `for (i < strings.length - 1)` loop runs 0 iterations, markup = strings[0]. Works. |
| Ensure `<if>` with `@click` attribute markers work correctly | `_template-instance.js` attribute detection | When the external HTML has `@click=${() => ...}` the `${}` is in the raw HTML, not in a tagged template slot. The parser must find `__attr_N__` patterns in the original HTML string. |

Wait — this is the critical issue. When the HTML is in an external file, `${}`
expressions can't be extracted by the tagged template mechanism. The `${}`
is inside the string, not in the template literal positions.

The solution is a **pre-processing step in `htmlFromString`**:

```js
export function htmlFromString(str) {
  // Find all ${...} expression and replace with markers
  const reJS = /\$\{([^}]*)\}/g;
  const values = [];
  let lastIdx = 0;
  const parts = [];
  let match;
  while ((match = reJS.exec(str)) !== null) {
    parts.push(str.slice(lastIdx, match.index));
    parts.push(match[0]); // placeholder — will be replaced by the template
    values.push(match[1].trim()); // store the JS expression as string
    lastIdx = reJS.lastIndex;
  }
  parts.push(str.slice(lastIdx));

  // Convert to TemplateStringsArray-like + value array
  // But we need the EXPRESSION to be evaluated at render time, not now.
  // This requires runtime eval or a callback.
}
```

This is the hard part. `${}` in external HTML files can contain:
- `store.state.x = y` (mutation) 
- `someFunction(id)` (function call)
- `Math.random()` (complex JS)

The current template engine handles these because they're **closures** captured
in the template literal's evaluation. But from a string, they'd need `eval()` or
a pre-defined context function.

**Solution**: instead of supporting full JS expressions in `${}` inside external
HTML files, define a convention:

1. Use `onclick=` (native event) or `@action=name` (Pix action dispatch) instead
   of `@click=${() => ...}` in external template files.
2. Actions are dispatched via `CustomEvent('rule-action', { detail: { name, args } })`
3. The component listens for `rule-action` events

Or, simpler:

2. **Wrap with a compile step**: the Pix tool `pix_component` compiles `.template.html`
   files at build time into `.template.compiled.js` files that export `html\`\``:

```js
// Generated from _ContactList.template.html by pix_component
export default function template(ctx) {
  return html`
    <section data-part="contact-list">
      ...
      <button @click=${() => ctx.delete(c.id)}>Delete</button>
    </section>
  `;
}
```

This is the **most robust solution**. The `.template.html` is a DevX convenience,
compiled to real `html\`\`` by the `pix_component` tool.

But for runtime-only (no build step), we need the event dispatch pattern.

**Revised approach for Pattern C:**

```
External HTML template (.template.html)
  → NO ${} expressions (they can't be dopplered from a string without eval)
  → ONLY {{ }} expressions + <for> + <if> + native on* events
  → @action directives for Pix action dispatch
  → Event delegation via parent CE

Runtime flow:
  1. Load .template.html as string
  2. htmlFromString(str) → TemplateResult with values = []
  3. TemplateInstance from string (only {{ }}, <for>, <if> parts)
  4. Effect calls render(result, container, context)
  5. Only context-based expressions update — no ${} closures
```

### 5.7 Engine changes summary

| File | Change | Risk |
|------|--------|------|
| `_template-helpers.js` | Add `htmlFromString(str)` | Low — just wraps |
| `_template-instance.js` | `getTemplate()` fix for single-string input | Medium — edge case with no `${}` |
| `_template-instance.js` | Markers in attribute values for `@action` | Medium — need to recognize `@action` |
| `_child-node-part.js` | Handle `TemplateResult` from `htmlFromString` | Low — same as normal |
| `index.js` re-export | Export `htmlFromString` | Low |

---

## 6. IDE Extension: `html\`\`` → JSX-like Experience

### 6.1 The problem

```js
const result = html`
  <div data-part="card">
    <h3>{{ title }}</h3>
  </div>
`;
```

VS Code highlights this as a regular string (green/amber). No syntax errors
detected, no autocomplete for HTML tags or `data-part` attributes. The HTML
is invisible to the editor's HTML language service.

### 6.2 What a proper extension should do

| Feature | Effort | Priority |
|---------|--------|----------|
| HTML syntax highlighting inside `html\`\`` | Low | P0 |
| Autocomplete: HTML tags, `data-part` attributes | Low | P0 |
| Syntax validation: unclosed tags, wrong nesting | Medium | P1 |
| `{{ }}` expression syntax highlighting | Low | P0 |
| `<for>` / `<if>` / `<switch>` semantic validation | Medium | P1 |
| Go-to-definition: `${ComponentName}` → Component file | High | P2 |
| Preview: rendered HTML side-by-side | Very High | P3 |

### 6.3 Implementation: VS Code TextMate injection (P0)

The easiest path is a VS Code extension that uses **TextMate grammar injection**
to re-tokenize `html\`\`` tagged template literals as HTML:

```json
// contributes.grammars
{
  "scopeName": "inline.rule-html-template",
  "injectionSelector": "L:source.js -string -comment",
  "patterns": [
    {
      "include": "#rule-html-tagged-template"
    }
  ]
}
```

This takes ~1 day to implement and provides 90% of the value (syntax
highlighting, bracket matching, comment toggling).

### 6.4 Implementation: Language Server for `.template.html` files (P1)

For the external HTML template files, create a simple language server that:

1. Provides syntax highlighting for `.template.html` files
2. Validates `{{ }}` expressions against a context schema
3. Validates `<for>` each expressions (`item in collection`)
4. Validates `<if>` condition expressions

This is a medium effort (~1 week) but provides the best DX for Pattern C.

### 6.5 Recommended approach

1. **Week 1**: VS Code extension with TextMate injection for `html\`\``
   highlighting (focused on the 80% use case: Pattern A and B)
2. **Month 2**: Language server for `.template.html` files (Pattern C)
3. **Month 3+**: Go-to-definition for component references, autocomplete

---

## 7. Implementation Status

> **All phases completed.** See `core/ARCHITECTURE.md` and `SKILL.md` for current documentation.

The following was implemented from this design document:

### Phase 1: Documentation (completed)
- Pattern B (Functional Component) documented in SKILL.md §5B
- Pattern C (External HTML template) documented in SKILL.md §5C
- Composition (`{{ FnName(args) }}`) documented in SKILL.md §Composition
- Scope resolution chain (`_scope → _context → component instance`) documented

### Phase 2: Template Engine v2 (completed)
- `${}` removed from templates — only `{{ }}` for data, `@event="handler"` for events
- `@click="handler(args)"` pre-processing with `$event` keyword and auto-inject
- `FnName(args)` function call detection in expression parser
- `evaluateExpression()` now accepts optional `scope` param
- `EventPart` resolves handlers via `_scope → _context → component instance`
- `html()` accepts both tagged templates and strings (Pattern C)
- `loadTemplate()` helper fetches external `.template.html` files

### Phase 3: vrComponent Decorator (completed)
- `vrComponent()` decorator in `static {}` block — no base class, no inheritance
- Handles `customElements.define()`, CSS loading (3 modes), auto `connectedCallback`
- `context()` is optional — defaults to `{}` if not defined
- `template:` option for Pattern C — no `render()` method needed
- Auto `_scope = this`, mount guard, cleanup in `disconnectedCallback`

### Phase 4: Examples (completed)
- `vr-component/` — Counter (Pattern A)
- `fn-component/` — List (Pattern B)
- `vr-component-html/` — User card (Pattern C)
- `combo/` — Todo (all patterns mixed)

### Phase 5: Guardrails (completed)
- `VANILLA_REACTIVE_GUARDRAILS` with 9 rules (Pattern A/B/C, templates)
- `JS_GUARDRAILS` with 9 generic JS rules (braces, blank lines, arrows, etc.)
- Post-processing: Prettier + blank-line fixer + block-spacing fixer

### Phase 6: IDE Extension (completed)
- VS Code extension with TextMate grammar for `html\`\`` inside JS/TS
- Language support for `.template.html` files (syntax highlighting)
- 14 snippets (component templates, directives, expressions)
- Context-aware completion provider
| Update guardrails for new patterns | SKILL.md guardrails section | 30m |
| Document `bindElement()` helper | SKILL.md new §7 or as helper | 1h |

### Phase 2: Engine changes (`examples/src/core/template-engine/`)

| Task | Files | Estimate |
|------|-------|----------|
| Add `htmlFromString(str)` | `_template-helpers.js` | 30m |
| Fix `getTemplate()` for single-segment strings | `_template-instance.js` | 30m |
| Test: external HTML with `{{ }}`, `<for>`, `<if>` | New test file | 1h |
| Add `@action` directive parsing support | `_template-instance.js` + `_event-part.js` | 2h |
| Export `htmlFromString` from barrel | `index.js` | 10m |

### Phase 3: New example components for each pattern

| Task | Files | Estimate |
|------|-------|----------|
| Create `examples/src/components/ContactCard/` (Pattern A) | `_ContactCard.js`, `_ContactCard.css`, `index.js` | 1h |
| Create `examples/src/helpers/func/` (Pattern B) | `_todoList.js`, `_contactCard.js` | 1h |
| Create `examples/src/components/ContactList/` (Pattern C + .template.html) | `_ContactList.js`, `_ContactList.css`, `_ContactList.template.html`, `index.js` | 1.5h |
| Update `examples/src/index.js` to use all 3 patterns | `index.js` | 1h |

### Phase 4: Guardrails

| Task | Files | Estimate |
|------|-------|----------|
| Add guardrail: external HTML file uses `data-part` | `guardrail-defs.js` | 30m |
| Add guardrail: `.template.html` has no `<div>` abuse | `guardrail-defs.js` | 30m |
| Add guardrail: functional component is a pure function | `guardrail-defs.js` | 30m |

### Phase 5: Port to rule

| Task | Files | Estimate |
|------|-------|----------|
| Sync SKILL.md | `rule-frontend-vanilla-reactive/SKILL.md` | 1h |
| Sync core engine | `rule-frontend-vanilla-reactive/examples/src/core/` | 1h |
| Sync example components | `rule-frontend-vanilla-reactive/examples/src/` | 1h |
| Sync guardrails | `rule-mcp` guardrail definitions | 1h |

### Phase 6: IDE Extension (optional, starts Month 2)

| Task | Estimate |
|------|----------|
| VS Code extension scaffold + TextMate injection | 2 days |
| `.template.html` support + basic LSP | 1 week |

### Total effort

| Phase | Hours | Who |
|-------|-------|-----|
| 1 — SKILL.md docs | 7h | Pix skill editor |
| 2 — Engine changes | 4h 40m | Core maintainer |
| 3 — Examples | 4h 30m | Same |
| 4 — Guardrails | 1h 30m | Same |
| 5 — rule port | 4h | Same |
| 6 — IDE extension | ~2 weeks (optional) | Separate track |
| **Total code+docs** | **~21h** | Core maintainer |

---

## 8. Guardrails update

New guardrails to add (in `src/core/guardrail-defs.js`):

### 8.1 functional-component-pattern
```js
{
  id: 'functional-component-pattern',
  description: 'Functional component is a plain function returning html``',
  test: (code) => !(code.includes('class ') && code.includes('extends HTMLElement')) 
         || code.includes('function ') && code.includes('return html`'),
  remediation: 'Wrap functional components in plain functions, not classes'
}
```

### 8.2 external-template-no-classes
```js
{
  id: 'external-template-no-classes',
  description: 'External .template.html files use data-part selectors, no CSS classes',
  severity: 'error',
  test: (code, file) => !file.endsWith('.template.html') || !/class\s*=\s*["']/.test(code),
  remediation: 'Use data-part="role" instead of class="name" in template files'
}
```

### 8.3 template-file-syntax
```js
{
  id: 'template-file-syntax',
  description: 'External template files can only use {{}}, <for>, <if> — no ${}',
  severity: 'warning',
  test: (code, file) => !file.endsWith('.template.html') || !/\$\{/.test(code),
  remediation: 'Use @action directives instead of ${} closures in external templates'
}
```

---

## 9. Key Technical Decisions

### 9.1 Why NOT eval for `${}` in external HTML

The naive approach is `eval("(ctx) => " + jsExpr)`. Rejected because:
- CSP (Content Security Policy) blocks `eval()` in production
- Reactive bindings (like `store.state.x = y`) need the **closure**, not the string
- `eval()` makes the template file a security vector for XSS
- The mental model breaks — "why does this work in `html\`\`` but not in a file?"

### 9.2 Why NOT full runtime string interpolation

The alternative is a `Function` constructor with a proxy context. Rejected because:
- `new Function('ctx', 'store', expr)` is still dynamic code generation (blocked by CSP)
- Debugging is a nightmare (no stack traces for inline functions)
- Template files should be **static and renderable as preview**, not executable

### 9.3 Why `@action` directives

The `@action` directive is a **declarative event convention**:

```html
<button @action="toggle:todo.id">Toggle</button>
```

The template engine translates this to:
```js
button.addEventListener('click', () => {
  button.dispatchEvent(new CustomEvent('rule-action', {
    bubbles: true,
    detail: { action: 'toggle', args: { todo: todo.id } }
  }));
});
```

The parent CE catches the event and routes it to the right store mutation.
This is deterministic, CSP-safe, and typeable in a `.template.html` file.

### 9.4 Why `htmlFromString` is low-risk

The `getTemplate()` function in `_template-instance.js` already handles:
- HTML assembly from template parts
- `<for>` / `<if>` directive extraction
- `{{ }}` expression replacement
- DOMPart creation

Passing a single-segment string `[fullHtml]` works because the loop
`for (let i = 0; i < strings.length - 1; i++)` runs ZERO iterations
(when `strings.length === 1`), falling through directly to:
- `<for>`/`<if>` extraction
- `{{ }}` replacement
- DOM parsing

This is a bugfix in disguise — the engine was designed for multi-segment
`html\`\`` and the single-segment case is a natural extension.

---

## 10. References

- Current SKILL.md: `skills/rule-frontend-vanilla-reactive/SKILL.md`
- Current CE example: `skills/rule-frontend-vanilla-reactive/examples/src/components/App/_App.js`
- Current template engine: `skills/rule-frontend-vanilla-reactive/examples/src/core/template-engine/`
- Functional component pattern (ad-hoc): `rule-architect-web/interview.js`
- External HTML template pattern (no engine): `mtg-maniac/src/scripts/components/app/MtgApp/`
- IDE extension prior art: `lit-plugin` (VS Code), `es6-string-html` (TextMate)
