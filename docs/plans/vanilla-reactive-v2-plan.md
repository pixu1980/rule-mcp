# Execution Plan: Pix Vanilla Reactive — 3 Component Modes

> **Date**: 2026-07-18
> **Author**: pix-galaxy-mcp maintainer
> **Scope**: `~/Projects/pixu1980/pix-galaxy-mcp`
> **Reference**: `docs/analysis.md` (deep analysis with all context)

---

## Summary of decisions

| Decision | Value |
|----------|-------|
| Expression syntax | ONLY `{{ expr \| filter }}` — remove `${}`, remove `{{{ }}}` |
| `\| raw` filter | The escape hatch for unescaped HTML — document prominently |
| Events | `@click="handlerName(args)"` — NO `@click=${fn}` |
| Handler resolution | `_handlers` object alongside `_context` |
| `$event` | Reserved keyword — injects native DOM event at click time |
| Composition | `{{ Component(ctx) }}` — TemplateResult returned from `{{ }}` |
| `.value="{{ }}"` | Property binding via `{{ }}` (auto-detected) |
| Decorator | `VanillaReactiveComponent(this, { tag, css, render, context })` in `static {}` |
| CSS loading | Convention (same path), explicit path, explicit sheet — all 3 |
| Evaluation | Eager (args resolved at render time) |
| IDE extension | VS Code TextMate + LSP — level 1+2 |
| Base class | NONE — everything in `VanillaReactiveComponent()` decorator |

---

## Architecture diagram (new)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Pix Vanilla Reactive — v2 Architecture               │
└─────────────────────────────────────────────────────────────────────┘

                      Pattern A / C                    Pattern B
                    (Custom Element)              (Functional)
                    ────────────────           ────────────────
                    class App extends          function TodoList(ctx) {
                    HTMLElement {                return html`
                    static {                     <ul>
                      VanillaReactive            <for each="todo in todos">
                      Component(this,            <li>{{ todo.title }}</li>
                      { tag:'app-root',          </for>
                        css: meta.url,          </ul>
                        render(ctx) {         `;
                      }                        }
                    })                          ─── _handlers ───
                    }                           { handleSave,
                      handleSave(id) {           handleDelete,
                        store.del(id);           handleToggle }
                      }
                    }

                          │                           │
                          ▼                           ▼

                    ┌─────────────────────────────────────────┐
                    │        Template Engine (v2)              │
                    │                                         │
                    │  html`...`  →  getTemplate(strings)      │
                    │    1. Parse {{ expr }}, <for>, <if>     │
                    │    2. Parse @click="fn(args)"            │
                    │    3. Parse .value="{{ }}" as property   │
                    │    4. Create DOMParts                    │
                    │                                         │
                    │  render(result, container, context)      │
                    │    1. TemplateInstance.update(context)   │
                    │    2. ExprParts → evaluate + render      │
                    │    3. ForParts/IfParts → iterate         │
                    │    4. EventParts → bind handlers         │
                    └─────────────────────────────────────────┘
                          │
                          ▼
                    ┌─────────────────────────────────────────┐
                    │        DOMParts → Live DOM               │
                    │                                         │
                    │  ExprPart  →  textContent (escaped)      │
                    │    OR       →  TemplateResult (nested)   │
                    │  EventPart →  click → _handlers.fn(args) │
                    │  ForPart   →  keyed reconciliation       │
                    │  IfPart    →  conditional show/hide      │
                    │  PropPart  →  el[prop] = value           │
                    └─────────────────────────────────────────┘
```

---

## Phase breakdown

### Phase 0: Template Engine — remove `${}`, add `@click="fn"`

**Files**: `examples/src/core/template-engine/`
**Why first**: Everything depends on the new event + expression system.

| Step | Task | Details |
|------|------|---------|
| 0.1 | **Remove `${}` from `getTemplate()`** | Delete `__attr_N__` marker logic, delete `<!--val:N-->` logic, delete single-star `${\\} expr` regex. The only remaining expressions are `{{ }}`, `<for>`, `<if>`. |
| 0.2 | **Add `@click="fn(args)"` parsing** | Pre-process markup: extract `@click="..."` → store `{ handler: 'fn', args: ['$event', 'id'], raw: string }`. Replace with `data-pix-handler="IDX"` marker. |
| 0.3 | **Handle no-args case** | `@click="handleSave"` → args = empty array → at click time, inject `[$event]` implicitly. |
| 0.4 | **Handle `$event` keyword** | `@click="handleSave($event, id)"` → args = `['$event', 'id']` → `$event` is replaced with actual DOM event at click time. |
| 0.5 | **Add `.value="{{ }}"` property detection** | In attribute walker: if `rawName.startsWith('.')` AND value contains `{{ }}` → create `PropertyPart` instead of `AttributePart`. |
| 0.6 | **Update `TemplateInstance.updateWithContext()`** | Remove `${}` values loop (it was `this.parts`). Keep: `exprParts` ({{ }}), `forParts`, `ifParts`, `eventParts` (new `@click`). |
| 0.7 | **Add `EventPart` for `@click`** | New `ClickHandlerPart` (rename old `EventPart`). Constructor: `(el, handlerName, argExprs, renderTime)`. Stores: function reference from `_handlers`, resolved args. |
| 0.8 | **Update `ExprPart` for composition** | `setValue()` → if evaluated value is a `TemplateResult` (`{ kind: 'template-result' }`), render it via `ChildNodePart` nested rendering. |

**Estimated**: 4h

### Phase 1: Template Engine — align `{{ }}` with new semantics

**Files**: `examples/src/core/template-engine/`

| Step | Task | Details |
|------|------|---------|
| 1.1 | **`htmlFromString()` → rename to `html()`** | With `${}` removed, the single-export `html` now works for both tagged templates and string input. `html(str)` returns `{ kind: 'template-result', strings: [str], values: [] }`. `html\`...\`` still works as tagged template. |
| 1.2 | **Remove old `_template-helpers.js` exports** | Remove `directive`, `model`, `repeat`, `isDirective` — they were for `${}` only. Keep only `html`, `registerFilter`, `FILTERS` in the template helper. |
| 1.3 | **Add `_handlers` support to render pipeline** | `render(result, container, context, handlers)` — accepts optional `handlers` object. TemplateInstance stores it. EventParts use it. |
| 1.4 | **Document `_context` + `_handlers`** | `result._context = ctx; result._handlers = { handleSave };` — both are set BEFORE `render()`. |

**Estimated**: 2h

### Phase 2: VanillaReactiveComponent decorator

**Files**: `examples/src/core/decorator/_vanilla-reactive-component.js`
**Why**: This is the core DX improvement. One call in `static {}` replaces 15 lines of boilerplate.

```js
// Final API:
export function VanillaReactiveComponent(klass, opts = {}) {
  const {
    tag,                  // required: custom element tag name
    css,                  // optional: 'auto' (convention), path string, or CSSStyleSheet[]
    render,               // optional: function name or method name
    context,              // optional: method name or function
  } = opts;
  // ...
}
```

| Step | Task | Details |
|------|------|---------|
| 2.1 | **Implement` VanillaReactiveComponent()`** | Register `customElements.define()`, adopt CSS, set up `connectedCallback` override with effect, lifecycle, cleanup. |
| 2.2 | **CSS loading: 3 modes** | `css: 'auto'` → resolve CSS path from `import.meta.url` (e.g., `_App.js` → `_App.css`). `css: './path.css'` → fetch + adopt. `css: [sheet]` → direct adopt. |
| 2.3 | **Auto-context from methods** | Scan `klass.prototype` for methods named `context()` or `getContext()`. Call it each render cycle. Result is `_context`. |
| 2.4 | **Auto-handlers from methods** | Scan `klass.prototype` for NON-constructor methods (excluding `render`, `context`, `connectedCallback`, lifecycle). Bind them as `_handlers`. |
| 2.5 | **Render loop** | In `connectedCallback` (overridden internally): create `effect()` that calls `this.render(ctx)`, attaches `_context` and `_handlers`, calls `render()`. |
| 2.6 | **Mount guard + cleanup** | `_vanillaBound` guard. `disconnectedCallback` dispose. |

**Estimated**: 4h

### Phase 3: SKILL.md rewrite

**Files**: `SKILL.md`

| Step | Task | Details |
|------|------|---------|
| 3.1 | **Remove `${}` from all docs** | Every example: `@click=${fn}` → `@click="fn"`, `${expr}` → `{{ expr }}` |
| 3.2 | **Add `\| raw` filter documentation** | Prominently in the expression table + dedicated subsection |
| 3.3 | **Rewrite §4 Template Engine API** | New exports: only `html`, `render`, `registerFilter`. New section: `_handlers`. |
| 3.4 | **Rewrite §5 Component Patterns** | 3 modes table + Pattern A (VanillaReactiveComponent) + Pattern B (functional) + Pattern C (external `.template.html`) |
| 3.5 | **Add §5.4 @click handler reference** | Show: `handleSave`, `handleSave(args)`, `handleSave($event, arg)`, `handleSave($event, {{ expr }})` |
| 3.6 | **Add §12 Composition** | `{{ Component(ctx) }}` with TemplateResult rendering |
| 3.7 | **Update guardrails** | Remove guardrails referencing `${}`. Add guardrails for `@click`, `_handlers`. |

**Estimated**: 6h

### Phase 4: Examples rewrite

**Files**: `examples/src/`

| Step | Task | Details |
|------|------|---------|
| 4.1 | **Rewrite `examples/src/core/template-engine/`** | Apply Phase 0+1 changes to all engine files |
| 4.2 | **Rewrite `examples/src/core/index.js`** | Remove old exports, add new ones (VanillaReactiveComponent, etc.) |
| 4.3 | **Rewrite `examples/src/components/App/`** | Pattern A using `VanillaReactiveComponent(this, { tag: 'app-root', css: 'auto' })` |
| 4.4 | **Rewrite `examples/src/components/TodoItem/`** | Pattern A child, using `{{ TodoItem(ctx) }}` |
| 4.5 | **Create `examples/src/helpers/func/_todoList.js`** | Pattern B functional component with `_handlers` |
| 4.6 | **Create `examples/src/components/ProfileCard/`** | Pattern C with `.template.html` + `VanillaReactiveComponent` + external CSS |
| 4.7 | **Rewrite `examples/src/index.js`** | Wire all three patterns |

**Estimated**: 6h

### Phase 5: Guardrail definitions update

**Files**: `src/core/guardrail-defs.js`

| Step | Task | Details |
|------|------|---------|
| 5.1 | **Remove `${}` guardrails** | Remove `html-template` check for `${}`. Replace with `{{ }}` check. |
| 5.2 | **Add `@click` guardrails** | `@click` must use `="fn(args)"` not `=${\\fn}` |
| 5.3 | **Add `_handlers` guardrails** | Check that `_handlers` is set or component has handler methods |
| 5.4 | **Add `VanillaReactiveComponent` guardrails** | Check that `VanillaReactiveComponent(this, ...)` is called in `static {}` |

**Estimated**: 1h 30m

### Phase 6: IDE extension

**Files**: `extensions/vscode/` (new directory at repo root)

| Step | Task | Details |
|------|------|---------|
| 6.1 | **Scaffold VS Code extension** | `yo code`, `package.json`, `activationEvents` |
| 6.2 | **TextMate grammar injection** | Inject `html\\`\\`` as HTML region. Highlight `{{ expr }}`, `@click`, `<for>`, `<if>` |
| 6.3 | **Simple LSP for `.template.html` files** | Syntax validation, `{{ }}` expression validation, `@click` syntax validation |
| 6.4 | **Marketplace publish** | Package + publish |

**Estimated**: 1 week (separate track)

---

## Dependency graph

```
Phase 0 (engine: remove $, add @click)
  └── Phase 1 (engine: align {{ }} semantics)
        ├── Phase 2 (VanillaReactiveComponent decorator)
        │     └── Phase 3 (SKILL.md rewrite)
        │           └── Phase 4 (examples rewrite)
        ├── Phase 5 (guardrail definitions)
        └── Phase 6 (IDE extension) — can start in parallel to Phase 3
```

---

## Where handlers live: resolution rules

```
@click="handleSave"
  → handler = _handlers.handleSave  OR  component.handleSave
  → args = [$event]                    (auto-injected)
  → calls: handler(event)

@click="handleSave(todo.id)"
  → handler = _handlers.handleSave  OR  component.handleSave
  → args = [evaluate('todo.id', mergedContext)]
  → calls: handler(resolvedId)

@click="handleSave($event, todo.id)"
  → handler = _handlers.handleSave  OR  component.handleSave
  → args = [$event (click-time), evaluate('todo.id', mergedContext)]
  → calls: handler(event, resolvedId)
```

**Merged context for args resolution:**
1. For-loop variables: `todo` from `<for each="todo in todos">`
2. Render context: `ctx` (the `_context` object)
3. `$event`: reserved → replaced with DOM Event at click time

---

## VanillaReactiveComponent API (final)

```js
import { VanillaReactiveComponent, html, render, registerFilter } from './core/index.js';

// ── Pattern A: Custom Element ──────────────────────────────────
class App extends HTMLElement {
  static {
    VanillaReactiveComponent(this, {
      tag: 'app-root',
      css: 'auto',               // loads ./_App.css via convention
    });
  }

  // Auto-exposed as _handlers → @click resolver
  handleDelete(id) { store.state.todos = store.state.todos.filter(t => t.id !== id); }

  // Auto-called each render cycle → _context
  context() {
    return {
      title: store.state.title,
      todos: store.state.todos,
    };
  }

  // Auto-called each render cycle
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

```js
// ── Pattern B: Functional Component ────────────────────────────
import { html } from '../core/index.js';

const _handlers = {
  handleSave: (id) => { /* ... */ },
};

export function TodoList(ctx) {
  ctx._handlers = _handlers;
  return html`
    <for each="todo in ctx.todos">
      <button @click="handleSave(todo.id)">Save</button>
    </for>
  `;
}
```

```js
// ── Pattern C: External HTML Template ──────────────────────────
import { VanillaReactiveComponent, html, render } from '../core/index.js';

const templateStr = await (
  await fetch(new URL('./_ProfileCard.template.html', import.meta.url))
).text();
const TEMPLATE = html(templateStr);  // html() now accepts strings too

class ProfileCard extends HTMLElement {
  static {
    VanillaReactiveComponent(this, {
      tag: 'profile-card',
      css: 'auto',
    });
  }

  handleToggle(id) { /* ... */ }

  context() {
    return { name: store.state.name, todos: store.state.todos };
  }

  // For Pattern C, render() returns the pre-parsed template
  render(ctx) {
    const result = TEMPLATE;
    result._context = ctx;
    result._handlers = this;    // component methods = handlers
    return result;
  }
}
```

---

## Next steps

Phase 0 is the foundation. Without it, nothing else compiles.
Recommendation: start with Phase 0.1–0.8 (engine), deliver a working
`getTemplate()` without `${}`, then proceed to Phase 1.

Ready to start when you give the green light.
