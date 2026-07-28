# rule-vanilla-reactive Pattern Index

Quick reference: what exists and where to find it.

## Core Files (in SKILL.md)

| File | Export | Lines |
|------|--------|-------|
| `core/signals/_base-signal.js` | `BaseSignal` | ~30 |
| `core/signals/_state-signal.js` | `StateSignal` | ~40 |
| `core/signals/_computed-signal.js` | `ComputedSignal` | ~90 |
| `core/signals/_collector-context.js` | `withCollector, withoutCollector` | ~50 |
| `core/signals/_effect-collector.js` | `EffectCollector` | ~40 |
| `core/signals/_scheduler.js` | `schedule` | ~25 |
| `core/signals/index.js` | `Signal, effect, isSignalLike` | ~25 |
| `core/store/_store.js` | `Store` | ~120 |
| `core/store/_clone.js` | `deepClone, clonePlainValue` | ~70 |
| `core/store/_guards.js` | `isObject` | ~5 |
| `core/store/_paths.js` | `toPathArray, pathToString` | ~15 |
| `core/store/index.js` | `Store` | ~2 |
| `core/template-engine/_template.js` | `render` + re-exports | ~30 |
| `core/template-engine/_template-instance.js` | `TemplateInstance, getTemplate` | ~200 |
| `core/template-engine/_template-helpers.js` | `html, directive, model` | ~50 |
| `core/template-engine/_expression-parser.js` | `parseExpression, evaluateExpression` | ~80 |
| `core/template-engine/_filters.js` | `registerFilter, FILTERS, built-in filters` | ~150 |
| `core/template-engine/_part.js` | `Part` (base with bindSignal) | ~20 |
| `core/template-engine/_attribute-part.js` | `AttributePart` (model) | ~115 |
| `core/template-engine/_child-node-part.js` | `ChildNodePart` | ~140 |
| `core/template-engine/_event-part.js` | `EventPart` | ~25 |
| `core/template-engine/_property-part.js` | `PropertyPart` | ~30 |
| `core/template-engine/_expr-part.js` | `ExprPart` ({{ }} with filters) | ~50 |
| `core/template-engine/_for-part.js` | `ForPart` (<for> directive) | ~100 |
| `core/template-engine/_if-part.js` | `IfPart` (<if> directive) | ~70 |
| `core/template-engine/_range.js` | `clearRange, moveRangeBefore, etc.` | ~60 |
| `core/template-engine/_parts.js` | re-exports all parts | ~8 |
| `core/template-engine/index.js` | exports | ~2 |
| `core/index.js` | unified exports | ~5 |

## Component Pattern (Custom Elements + adoptedStyleSheets)

Every component is a class extending `HTMLElement` with a `static {}` block that:
- Defines the custom element (`customElements.define`)
- Loads CSS from an external file (`_ComponentName.css`)
- Registers the stylesheet via `adoptedStyleSheets` API

```js
// _TodoItem.js — component file (_ prefix, PascalCase)
import { html, model } from '../../core/index.js';

// Load CSS as string via top-level await (no build step)
const cssText = await (
  await fetch(new URL('./_TodoItem.css', import.meta.url))
).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export class TodoItem extends HTMLElement {
  static {
    customElements.define('todo-item', this);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }

  connectedCallback() { /* instance rendering */ }
}

// Usage in parent component:
// <for each="todo in ctx.todos">
//   ${TodoItem(todo)}
// </for>
```

Key rules:
- **NO inline styles** (`style="..."` is forbidden in templates)
- CSS lives in a `.css` file with the same name and path as the `.js` file
- `static {}` loads CSS as a string → `CSSStyleSheet.replaceSync()` → `document.adoptedStyleSheets`
- Components are functions called via `${TodoItem(todo)}` inside `<for>`

## App Layer Convention

```
src/
  index.html                  ← Entry point HTML
  index.js                    ← Entry point JS
  core/                       ← Engine (kebab-case folder)
  components/                 ← UI components (PascalCase folders)
    App/
      index.js                ← barrel (no _ prefix)
      _App.js                 ← component (_ prefix + PascalCase)
      _App.css
    TodoItem/
      index.js
      _TodoItem.js
      _TodoItem.css
  helpers/                    ← Utilities (kebab-case folder)
    index.js                  ← barrel
    actions/
      index.js
      _addTodo.js
    computed/
      index.js
      _visibleTodos.js
    shared/
      index.js
  styles/                     ← Global CSS (kebab-case folder)
    index.css                 ← barrel, @imports
    _base.css
    _components.css
```

## Minimal App Skeleton

```js
import { Store, Signal, effect, html, render, model, registerFilter } from '@core/index.js';

// 1. Store + tickState
const store = new Store({ items: [], title: 'My App' });
const tickState = new Signal.State(0, { equals: () => false });
window.addEventListener('store:change', () => tickState.set(performance.now()));

// 2. Component CSS — external file, loaded as string → adoptedStyleSheets
const cssText = await (await fetch(new URL('./_App.css', import.meta.url))).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

// 3. Component (class with static init block, NO inline styles)
class App extends HTMLElement {
  static {
    customElements.define('app-root', this);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }

  static render(ctx) {
    return html`
      <h1>{{ title | upper }}</h1>
      <for each="item in ctx.items">
        <div>{{ item }}</div>
      </for>
    `;
  }
}

// 4. Render context
const renderContext = new Signal.Computed(() => {
  tickState.get();
  return { items: store.state.items, title: store.state.title };
});

// 5. Mount with context
effect(() => {
  const ctx = renderContext.get();
  const result = App.render(ctx);
  result._context = ctx;
  render(result, document.getElementById('root'));
});
tickState.set(performance.now());
```

## CSS Selector Strategy

Prefer **element selectors** and **attribute selectors** over classes where possible:

```css
/* ✅ PREFERRED: element selector for custom element root */
my-component { display: block; }

/* ✅ PREFERRED: attribute selector for state */
[data-state-completed="done"] { opacity: 0.6; }
[aria-current="page"] { font-weight: bold; }

/* ✅ PREFERRED: data-part attribute for variant distinction */
[data-part="button"] { padding: 0.5rem 1rem; }

/* ❌ FORBIDDEN: CSS classes — use element or [data-part] selectors */
/* .button { } .my-component { } */

/* ❌ AVOID: id for styling */
#submit { background: blue; }
```

Property ordering: positioning → layout → visibility → box model → colors → typography → motion → behavior

## Key Syntax Reference (template engine)

| Syntax | What it does |
|--------|-------------|
| `{{ expr }}` | Interpolate data expression (with filter pipes) |
| `{{ expr | filter }}` | Apply filter (`upper`, `slugify`, `default`, etc.) |
| `{{ expr | raw }}` | Output unescaped HTML |
| `${value}` | Pass JS value (handler, directive, signal) |
| `<for each="x in xs">` | Loop with string template mode |
| `<for each="x in xs">${Comp(x)}</for>` | Loop with component rendering |
| `<if condition="expr">` | Conditional rendering (supports signals) |
| `@click=${fn}` | Event listener |
| `model=${directive}` | Two-way binding |
| `.prop=${value}` | Property binding |

## Built-in Filters

`upper`, `lower`, `capitalize`, `slugify`, `slug`, `trim`, `escapeHtml`,
`striptags`, `raw`, `json`, `default`, `truncate`, `length`, `first`, `last`,
`join`, `tagLabel`, `tagHref`, `date`, `timeAgo`, `urlencode`, `sortBy`

## File Naming Rules

| Pattern | Rule | Example |
|---------|------|---------|
| Barrel | `index.*` | `index.js`, `index.css` |
| Component file | `_PascalCase.ext` | `_TodoItem.js`, `_TodoItem.css` |
| Helper/utility | `_kebab-case.ext` | `_base.css`, `_clone.js` |
| Test | `_PascalCase.test.js` | `__tests__/_TodoItem.test.js` |
| Component folder | `PascalCase/` | `TodoItem/` |
| Non-component folder | `kebab-case/` | `helpers/`, `core/` |

Import alias: `@` → `src/`. Example: `import { Store } from '@core/index.js'`.
