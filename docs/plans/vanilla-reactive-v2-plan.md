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
| Handler resolution | `_scope` object (Pattern B explicit) → `_context` (fallback) → component instance (auto) |
| `$event` | Reserved keyword — injects native DOM event at click time |
| Composition (fn) | `{{ FnName(args) }}` — calls fn that returns `TemplateResult` |
| Composition (CE) | `<my-component>` HTML tag in template |
| Scope resolution | `_scope` (explicit) → `_context` (fallback) → component instance (auto) |
| `.value="{{ }}"` | Property binding via `{{ }}` (auto-detected) |
| Decorator | `vrComponent(this, { tag, css, render, context })` in `static {}` |
| CSS loading | Convention (same path), explicit path, explicit sheet — all 3 |
| Evaluation | Eager (args resolved at render time) |
| IDE extension | VS Code TextMate + LSP — level 1+2 |
| Base class | NONE — everything in `vrComponent()` decorator |

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
                      vrComponent(this,           <for each="todo in todos">
                                             <li>{{ todo.title }}</li>
                      { tag:'app-root',          </for>
                        css: meta.url,          </ul>
                        render(ctx) {         `;
                      }                        }
                    })                          ─── _scope ───
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
                    │  EventPart →  click → _scope.fn(args) │
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
| 0.7 | **Add `ClickHandlerPart` for `@click`** | Constructor: `(el, handlerName, argExprs, renderTime)`. Stores: function reference from `_scope`, resolved args. |
| 0.8 | **Update expression parser for fn calls** | `parseExpression()` must detect `FuncName(args)` before `\|`. Return `{ kind: 'fn', name: 'FuncName', args: [...] }`. `evaluateExpression()` resolves name from context, evaluates args, calls fn. |
| 0.9 | **Update `ExprPart` for composition** | `setValue()` → if evaluated value is `{ kind: 'template-result' }`, render it via nested `TemplateInstance` (like old `ChildNodePart`). Otherwise: escaped textContent. |

**Estimated**: 4h

### Phase 1: Template Engine — align `{{ }}` with new semantics

**Files**: `examples/src/core/template-engine/`

| Step | Task | Details |
|------|------|---------|
| 1.1 | **`htmlFromString()` → rename to `html()`** | With `${}` removed, the single-export `html` now works for both tagged templates and string input. `html(str)` returns `{ kind: 'template-result', strings: [str], values: [] }`. `html\`...\`` still works as tagged template. |
| 1.2 | **Remove old `_template-helpers.js` exports** | Remove `directive`, `model`, `repeat`, `isDirective` — they were for `${}` only. Keep only `html`, `registerFilter`, `FILTERS` in the template helper. |
| 1.3 | **Add `_scope` support to render pipeline** | `render(result, container, context, handlers)` — accepts optional `handlers` object. TemplateInstance stores it. EventParts use it. |
| 1.4 | **Document `_context` + `_scope`** | `result._context = ctx; result._scope = { handleSave };` — both are set BEFORE `render()`. |

**Estimated**: 2h

### Phase 2: vrComponent decorator

**Files**: `examples/src/core/decorator/_vanilla-reactive-component.js`
**Why**: This is the core DX improvement. One call in `static {}` replaces 15 lines of boilerplate.

```js
// Final API:
export function vrComponent(klass, opts = {}) {
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
| 2.1 | **Implement` vrComponent()`** | Register `customElements.define()`, adopt CSS, set up `connectedCallback` override with effect, lifecycle, cleanup. |
| 2.2 | **CSS loading: 3 modes** | `css: 'auto'` → resolve CSS path from `import.meta.url` (e.g., `_App.js` → `_App.css`). `css: './path.css'` → fetch + adopt. `css: [sheet]` → direct adopt. |
| 2.3 | **Auto-context from methods** | Scan `klass.prototype` for methods named `context()` or `getContext()`. Call it each render cycle. Result is `_context`. |
| 2.4 | **Auto-handlers from methods** | Scan `klass.prototype` for NON-constructor methods (excluding `render`, `context`, `connectedCallback`, lifecycle). Bind them as `_scope`. |
| 2.5 | **Render loop** | In `connectedCallback` (overridden internally): create `effect()` that calls `this.render(ctx)`, attaches `_context` and `_scope`, calls `render()`. |
| 2.6 | **Mount guard + cleanup** | `_vanillaBound` guard. `disconnectedCallback` dispose. |

**Estimated**: 4h

### Phase 3: SKILL.md rewrite

**Files**: `SKILL.md`

| Step | Task | Details |
|------|------|---------|
| 3.1 | **Remove `${}` from all docs** | Every example: `@click=${fn}` → `@click="fn"`, `${expr}` → `{{ expr }}` |
| 3.2 | **Add `\| raw` filter documentation** | Prominently in the expression table + dedicated subsection |
| 3.3 | **Rewrite §4 Template Engine API** | New exports: only `html`, `render`, `registerFilter`. New section: `_scope`. |
| 3.4 | **Rewrite §5 Component Patterns** | 3 modes table + Pattern A (vrComponent) + Pattern B (functional) + Pattern C (external `.template.html`) |
| 3.5 | **Add §5.4 @click handler reference** | Show: `handleSave`, `handleSave(args)`, `handleSave($event, arg)`, `handleSave($event, {{ expr }})` |
| 3.6 | **Add §12 Composition** | `{{ Component(ctx) }}` with TemplateResult rendering |
| 3.7 | **Update guardrails** | Remove guardrails referencing `${}`. Add guardrails for `@click`, `_scope`. |

**Estimated**: 6h

### Phase 4: Examples rewrite

**Files**: `examples/src/`

| Step | Task | Details |
|------|------|---------|
| 4.1 | **Rewrite `examples/src/core/template-engine/`** | Apply Phase 0+1 changes to all engine files |
| 4.2 | **Rewrite `examples/src/core/index.js`** | Remove old exports, add new ones (vrComponent, etc.) |
| 4.3 | **Rewrite `examples/src/components/App/`** | Pattern A using `vrComponent(this, { tag: 'app-root', css: 'auto' })` |
| 4.4 | **Rewrite `examples/src/components/TodoItem/`** | Pattern A child, using `{{ TodoItem(ctx) }}` |
| 4.5 | **Create `examples/src/helpers/func/_todoList.js`** | Pattern B functional component with `_scope` |
| 4.6 | **Create `examples/src/components/ProfileCard/`** | Pattern C with `.template.html` + `vrComponent` + external CSS |
| 4.7 | **Rewrite `examples/src/index.js`** | Wire all three patterns |

**Estimated**: 6h

### Phase 5: Guardrail definitions update

**Files**: `src/core/guardrail-defs.js`

| Step | Task | Details |
|------|------|---------|
| 5.1 | **Remove `${}` guardrails** | Remove `html-template` check for `${}`. Replace with `{{ }}` check. |
| 5.2 | **Add `@click` guardrails** | `@click` must use `="fn(args)"` not `=${\\fn}` |
| 5.3 | **Add `_scope` guardrails** | Check that `_scope` is set or component has handler methods |
| 5.4 | **Add `vrComponent` guardrails** | Check that `vrComponent(this, ...)` is called in `static {}` |

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

## Nesting validation: Pattern C → Pattern B → Pattern A

### Scenario

```
Pattern C (external .template.html CE)
  └── {{ PatternB(ctx) }}  ← function call expression in {{ }}
        └── <pattern-a-ce>  ← native CE in the DOM subtree
```

### Step-by-step trace

**Step 1** — `_ProfileCard.template.html` contains:
```html
{{ TodoList(todos) }}
```
`getTemplate()` parses `{{ }}` as an `ExprPart` with expression `TodoList(todos)`.
`parseExpression("TodoList(todos)")` detects `FnName(...)` → returns:
```json
{ "kind": "fn", "name": "TodoList", "args": [{ "variable": "todos" }] }
```

**Step 2** — `evaluateExpression(fnExpr, ctx)`:
- Resolves `ctx['TodoList']` → the imported Component function ✓
- Resolves `ctx['todos']` → the data array ✓
- Calls `TodoList(ctx.todos)` → returns a `TemplateResult` ✓

**Step 3** — `ExprPart.setValue()` receives the `TemplateResult`:
- Detects `val.kind === 'template-result'`
- Creates a nested `TemplateInstance` from the TemplateResult's strings
- Renders the document fragment into the DOM at the ExprPart's position

The fragment contains `<todo-item>` tags, which the browser upgrades.

**Step 4** — `<todo-item>` `connectedCallback` fires:
- `vrComponent` starts its own effect loop
- Component renders independently with its own `html\`\``
- Nested CE behaves as a standard Pattern A component

### Requirements

| Requirement | Phase | Status |
|------------|-------|--------|
| `parseExpression()` supports `fn(args)` syntax | 0.8 | ✅ Added to plan |
| `evaluateExpression()` resolves fn from ctx, calls it | 0.8 | ✅ Added to plan |
| `ExprPart` renders `TemplateResult` objects | 0.9 | ✅ Added to plan |
| Mutable `{{ }}` args update on each render | 0.9 | ✅ ExprPart re-evaluates each cycle |
| Pattern C passes functions in context | phase 3 | ✅ Documented convention |
| Native CE lifecycle (`connectedCallback`) | — | ✅ Already works, no change needed |

### Convention: component functions in context

For **Pattern C** (external template, no closure), component functions MUST
be passed in the context object:

```js
import { TodoList } from '../helpers/func/_todoList.js';

class ProfileCard extends HTMLElement {
  context() {
    return {
      todos: store.state.todos,
      TodoList: TodoList,   // ← explicit, required for Pattern C
    };
  }
}
```

For **Pattern A/B** (closure available), component functions are already
in scope via `import`. Passing them in context also works and makes the
template self-documenting.

**Verdict: ✅ The nesting chain is fully supported.**

---

## Dependency graph

```
Phase 0 (engine: remove $, add @click, add fn call parser)
  └── Phase 1 (engine: align {{ }} semantics, add ExprPart composition)
        ├── Phase 2 (vrComponent decorator)
        │     └── Phase 3 (SKILL.md rewrite)
        │           └── Phase 4 (examples rewrite)
        ├── Phase 5 (guardrail definitions)
        └── Phase 6 (IDE extension) — can start in parallel to Phase 3
```

---

## Scope resolution (why not automatic from closures)

**Short answer:** JavaScript tagged template literals don't expose closure
scope. `html\`\`` receives only strings and `${}` values — with `${}`
removed, only strings remain. A name like `"handleSave"` in a template
string is just text; there is no API to check if it matches a `const`
in the caller's scope.

To make closures visible, we would need:
- `eval()` inside `html()` — breaks CSP, blocked in strict mode (modules)
- A Babel plugin (build-time analysis) — adds a build dependency

**Decision:** explicit `_scope` / `_context` for all patterns.
A future compile-time plugin can auto-generate `_scope`.

## Where handlers live: resolution rules

```
@click="handleSave"
  → handler = _scope.handleSave  OR  component.handleSave
  → args = [$event]                    (auto-injected)
  → calls: handler(event)

@click="handleSave(todo.id)"
  → handler = _scope.handleSave  OR  component.handleSave
  → args = [evaluate('todo.id', mergedContext)]
  → calls: handler(resolvedId)

@click="handleSave($event, todo.id)"
  → handler = _scope.handleSave  OR  component.handleSave
  → args = [$event (click-time), evaluate('todo.id', mergedContext)]
  → calls: handler(event, resolvedId)
```

**Merged context for args resolution:**
1. For-loop variables: `todo` from `<for each="todo in todos">`
2. Render context: `ctx` (the `_context` object)
3. `$event`: reserved → replaced with DOM Event at click time

---

## vrComponent API (final)

```js
import { vrComponent, html, render, registerFilter } from './core/index.js';

// ── Pattern A: Custom Element ──────────────────────────────────
class App extends HTMLElement {
  static {
    vrComponent(this, {
      tag: 'app-root',
      css: 'auto',               // loads ./_App.css via convention
    });
  }

  // Auto-exposed as _scope → @click resolver
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

const handleSave = (id) => { /* ... */ };

export function TodoList(ctx) {
  const result = html`
    <for each="todo in ctx.todos">
      <button @click="handleSave(todo.id)">Save</button>
    </for>
  `;
  result._scope = { handleSave };   // ← one line
  result._context = ctx;
  return result;
}
```

```js
// ── Pattern C: External HTML Template ──────────────────────────
import { vrComponent, html, render } from '../core/index.js';

const templateStr = await (
  await fetch(new URL('./_ProfileCard.template.html', import.meta.url))
).text();
const TEMPLATE = html(templateStr);  // html() now accepts strings too

class ProfileCard extends HTMLElement {
  static {
    vrComponent(this, {
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
    result._scope = this;    // component methods = handlers
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
