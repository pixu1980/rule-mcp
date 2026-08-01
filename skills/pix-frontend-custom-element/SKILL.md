---
name: rule-frontend-custom-element
description: >-
  Build Custom Elements v1 (autonomous and customized built-ins) in light DOM with zero dependencies: metadata-driven componentDecorator in a static {} block, adoptedStyleSheets, code-splitting (consts/utils/attributes/events/template), and a CLI scaffolder.
tags:
  - "frontend"
  - "vanilla"
  - "web-components"
  - "custom-elements"
  - "adopted-stylesheets"
  - "scaffolding"
frameworks: [vanilla]
---

# rule-frontend-custom-element

Build Custom Elements v1 in light DOM. CSS is adopted once via `document.adoptedStyleSheets` and lifecycle is wired by a metadata-driven decorator inside a `static {}` block.

## Outcome

Scaffold or extend a zero-dependency custom element (autonomous `<rule-card>` or customized built-in `<details is="rule-details">`) with:

- shared runtime helpers (`decorator/`, `events/`) centralised once per project
- a code-split file layout (`consts`, `utils`, `attributes`, `events`, `template`, `styles/`)
- automatic CSS adoption, safe `customElements.define`, and leak-free listener lifecycle

## When to use

Use this skill when a task asks to:

- create, scaffold, or edit Custom Elements v1
- build interactive widgets, reusable HTML/JS components, or web components
- wire component lifecycle code, `adoptedStyleSheets` styling, or `componentDecorator`
- extend a built-in element (customized built-ins, e.g. `<details is="rule-details">`)
- install shared component runtime helpers in a project or monorepo package

## Hard constraints

| Rule | Reason |
| ---- | ------ |
| No Shadow DOM | Light DOM keeps styles, slots, ARIA, and form participation natural |
| No `<template>` elements | Render via `innerHTML` or `insertAdjacentHTML`; never shadow roots |
| CSS via `adoptedStyleSheets` | One shared `CSSStyleSheet` per component class, never re-injected per instance |
| `static {}` block as the only registration site | CSS adoption + element define + mixins run once at module load, safe for HMR |
| Metadata-driven lifecycle | `static attributes`, `static events`, `static styles = styles` declare intent; `componentDecorator(this)` wires CSS adoption and lifecycle plumbing |
| `@rule-mcp/rule-core` is canonical | Keep `decorator/`, `events/`, and the tagged `template-engine/` in one shared workspace package |

Never inject `<style>` tags inside `render`/`onRender`/`connectedCallback`. CSS belongs to `adoptedStyleSheets` only.

## CLI scaffolder

The fastest path is the CLI scaffolder. It handles centralisation, conflict checks, and file generation in one shot.

```bash
# autonomous element (extends HTMLElement)
node <skill>/scripts/scaffold-component.mjs \
  --name "PixCard" \
  --target "<project-root>"

# customized built-in (extends HTMLDetailsElement)
node <skill>/scripts/scaffold-component.mjs \
  --name "PixDetails" \
  --extends "details" \
  --attributes "open" \
  --target "<project-root>"

# first run in a brand-new project or package target
node <skill>/scripts/scaffold-component.mjs \
  --name "PixCard" \
  --install-shared \
  --shared-dir "packages/rule-core" \
  --target "<project-root>"
```

The script:

1. Walks the project for an existing `componentDecorator` (skipping `node_modules`, `dist`, `build`).
2. Reuses that path when found. Otherwise installs the shared library at `--shared-dir` (only with `--install-shared`).
3. Generates the component files, importing runtime helpers from `@rule-mcp/rule-core/...`.
4. Refuses to overwrite existing files unless `--force` is set.
5. Outputs a JSON report: created files, shared-library path, computed import path, suggested next steps.

Flags:

| Flag | Default | Notes |
| ---- | ------- | ----- |
| `--name` | (required) | PascalCase class name; must yield a hyphenated tag |
| `--tag` | derived | Override the kebab-case tag |
| `--target` | `cwd` | Project root |
| `--components-dir` | `src/components` | Where to put the component folder |
| `--shared-dir` | `packages/rule-core` | Where to install `decorator/`, `events/`, and the browser-safe tagged `template-engine/` if missing |
| `--extends` | (none) | Built-in tag for customized built-ins (e.g. `details`) |
| `--attributes` | (empty) | Comma list — becomes `static attributes` keys |
| `--events` | (empty) | Comma list — becomes `static events` keys |
| `--install-shared` | `false` | Copy `decorator/`, `events/`, and the browser-safe tagged `template-engine/` if missing |
| `--force` | `false` | Allow overwriting existing files |
| `--dry-run` | `false` | Report what would be written without writing |

Run the test suite when modifying the script:

```bash
node --test <skill>/scripts/scaffold-component.test.mjs
```

## Manual workflow (when not using the CLI)

### Step 1 — discover existing centralisation

```bash
# Direct: find a file that exports componentDecorator
grep -rl "export function componentDecorator" --include="*.js" --include="*.mjs" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build .

# Indirect: find a shared decorator/index.js likely to be the central entry
find . -path "*/packages/rule-core/decorator/index.js" -not -path "*/node_modules/*" -not -path "*/dist/*"
```

### Step 2 — install once when missing

| Project shape | Recommended path |
| ------------- | ---------------- |
| Single app or package target | `src/shared/` |
| rule-mcp monorepo component package | `packages/rule-core/` |
| Existing workspace shared package | Reuse that path and expose it through a stable import alias/package name |

### Step 3 — scaffold the component

Naming convention: **folder name in PascalCase**, **file names in kebab-case** (matching the custom element tag).

```
packages/
  rule-core/          ← shared runtime (decorator/, events/, template-engine/)
  rule-details/
    src/
      components/
        PixDetails/
          rule-details.js
          rule-details.template.js
          rule-details.consts.js
          rule-details.utils.js
          rule-details.attributes.js
          rule-details.events.js
          styles/
            rule-details.css
            _core.css
            states/
              _states.css
```

## Code-splitting rules

Every rule component **must** split its source into focused modules:

| File | What goes in it |
| ---- | --------------- |
| `ComponentName.js` | Class body, `static` block, lifecycle hooks only. No imports of TemplateEngine or SVG icons. |
| `ComponentName.template.js` | `TemplateEngine` instance + all `engine.html` compiled render functions. Imports SVG icons via `bundle-text:`. |
| `ComponentName.consts.js` | Named `export const` values: string keys, enum-like arrays, lookup maps. No functions, no DOM. |
| `ComponentName.utils.js` | Pure `export const` functions: validators, mappers, DOM-free utilities. May import from `consts.js`. |
| `ComponentName.attributes.js` | `export default {}` map of attribute change handlers. Always present, even when empty. |
| `ComponentName.events.js` | `export default {}` map of DOM event handlers. Always present. |
| `ComponentName.css` | Component stylesheet, imported as raw text via `bundle-text:`. |
| `icons/*.svg` | One SVG file per icon, imported as raw text via `bundle-text:./icons/<name>.svg`. No inline SVG strings in JS files. |

Anti-patterns:

- Do not define constants or helper functions inside `ComponentName.js`.
- Do not put `TemplateEngine` or `engine.html` calls inside `ComponentName.js` — they belong in `ComponentName.template.js`.
- Do not inline SVG markup as template literals — use `icons/*.svg` files.
- Do not put DOM logic inside `consts.js` or `utils.js`.

## Class skeleton

```js
import styles from 'bundle-text:./PixDetails.css'; // Parcel
// import styles from './PixDetails.css?raw';      // Vite

import { componentDecorator } from '@rule-mcp/rule-core/decorator/index.js';
import { OPEN_STATES } from './PixDetails.consts.js';
import { resolveState } from './PixDetails.utils.js';
import attributes from './PixDetails.attributes.js';
import events from './PixDetails.events.js';

export class PixDetails extends HTMLDetailsElement {
  static extendsElement = 'details'; // omit for autonomous elements
  static attributes = attributes;
  static events = events;
  static styles = styles;

  static {
    componentDecorator(this);
  }

  constructor() {
    super();
    // initialise private state
  }

  // optional hooks - all called by the decorator if defined
  onRender() {} // before onConnected, also useful for idempotent setup
  onConnected() {} // after listeners are attached
  onDisconnected() {} // after listeners are removed
  onAttributeChanged(name, oldValue, newValue) {} // after typed handler
}
```

The static block is the **only** site where the element is wired up.

## What the decorator does

`componentDecorator(this)` runs four steps:

1. **Adopt CSS** — the CSS string (or `CSSStyleSheet`, or array of either) stored on `static styles` is added to `document.adoptedStyleSheets` exactly once per class (guarded with a `WeakSet`).
2. **Resolve tag** — `static isAttribute` wins; otherwise the class name is converted from PascalCase to kebab-case.
3. **Safe `customElements.define`** — skips when already defined; passes `{ extends }` when `static extendsElement` is set.
4. **Apply mixins to the prototype** — `componentName`, `handle<Name>AttributeChanged`, `handle<Type>Event`, `connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`, `handleEvent`, `observedAttributes`.

Generated lifecycle behaviour:

- **`connectedCallback`**: registers `this` as the EventListener for each key in `static events`, then calls `onRender?.()` then `onConnected?.()`.
- **`disconnectedCallback`**: removes those listeners, then calls `onDisconnected?.()`.
- **`attributeChangedCallback(name, oldValue, newValue)`**: dispatches to `handle<PascalName>AttributeChanged(oldValue, newValue)`, then calls `onAttributeChanged?.(name, oldValue, newValue)`.
- **`handleEvent(e)`**: dispatches to `handle<PascalType>Event(e)`. Because `this` implements the `EventListener` interface, listeners are removed cleanly without storing bound function references.

## Attributes file

```js
// PixDetails.attributes.js
import { events } from '@rule-mcp/rule-core/events/index.js';

export default {
  open(_oldValue, newValue) {
    const state = newValue === null ? 'closed' : 'open';
    this.setAttribute('aria-expanded', String(state === 'open'));
    events.dispatchComponentEvent.call(this, 'toggle', { state });
  },
};
```

`this` is the element. Keys become observed attributes automatically. Export `{}` when no attributes are observed — the file must still exist.

## Events file

```js
// PixDetails.events.js
import { events } from '@rule-mcp/rule-core/events/index.js';

export default {
  click(e) {
    if (e.target.matches('[data-action="close"]')) {
      this.collapse();
      events.cancelEvent(e);
    }
  },
};
```

Each key is a DOM event type. `this` is the element. The decorator attaches and detaches listeners across `connectedCallback` / `disconnectedCallback`.

## Bundler support — bundle-text vs ?raw

| Bundler | Import form | Notes |
| ------- | ----------- | ----- |
| Parcel | `import s from 'bundle-text:./x.css'` | Treats the file as a UTF-8 text asset |
| Vite / Rollup w/ vite-plugin | `import s from './x.css?raw'` | `?raw` query suffix |
| esbuild | `import s from './x.css'` | Configure `loader: { '.css': 'text' }` |
| webpack 5+ | `import s from './x.css?raw'` or asset/source | `webpack.config.js` rule with `type: 'asset/source'` |

The decorator's `registerStylesheet` accepts either a CSS **string** or a pre-built **`CSSStyleSheet`** (or an array of either) — so any of those import strategies work without code changes.

## Render with rule-template-engine

When the shared library includes the tagged runtime from `rule-template-engine`, compile reusable render functions once at module load:

```js
import TemplateEngine from '@rule-mcp/rule-core/template-engine/index.js';

const engine = new TemplateEngine();

const renderChevron = engine.html`<i class="rule-icon-chevron-down" aria-hidden="true"></i>`;
const renderRow = engine.html`<li>{{ label }} - {{ value }}</li>`;

// inside the class:
onRender() {
  this.querySelector('summary')?.insertAdjacentHTML('beforeend', renderChevron({}));
}
```

`engine.html` returns a `(data) => string` function. Compile once, invoke per render. Without the tagged runtime, use plain tagged template functions that return strings.

## Customized built-in elements vs autonomous

- **Customized built-in** (`<details is="rule-details">`) — class extends a specific HTML element (e.g. `HTMLDetailsElement`) and sets `static extendsElement = 'details'`. CSS targets `[is="rule-details"]`. Inherits all native semantics, accessibility, and form behaviour.
- **Autonomous** (`<rule-card>`) — class extends `HTMLElement`, no `extendsElement`. CSS targets the tag itself: `rule-card { ... }`.

Safari does not natively support customized built-ins. When targeting Safari, ship the [@ungap/custom-elements](https://github.com/ungap/custom-elements) polyfill at app startup or use autonomous elements.

## CSS architecture

Component CSS lives in a sub-layer per component under the rule layers (`reset, foundations, layout, components, helpers`):

```css
/* PixDetails.css */
@layer components.rule-details {
  :root {
    --rule-details--padding: var(--space-4);
    --rule-details--border-color: var(--color-border);
    --rule-details--border-radius: var(--card-border-radius, var(--radius-control));
  }

  [is='rule-details'] {
    padding: var(--rule-details--padding);
    border: 0.1rem solid var(--rule-details--border-color);
    border-radius: var(--rule-details--border-radius);
  }
}
```

Declare component-scoped tokens (`--rule-details--*`) at the top of the `@layer` block on `:root`, then map them to selectors. Use design-system semantic tokens (`--space-*`, `--color-*`, `--radius-*`) for the right-hand side so theme changes propagate. Selector strategy: prefer attributes (`[is="rule-details"]`, `[data-part="title"]`) over classes, prefer elements when semantics fit. Avoid id selectors.

## Resources

- CLI scaffolder: [`scripts/scaffold-component.mjs`](./scripts/scaffold-component.mjs) (+ tests in [`scripts/scaffold-component.test.mjs`](./scripts/scaffold-component.test.mjs))
- Decorator runtime (project-shared, install once): [`examples/decorator/index.js`](./examples/decorator/index.js)
- Events utilities (project-shared, install once): [`examples/events/index.js`](./examples/events/index.js)
- Full example component: [`examples/PixDetails/rule-details.js`](./examples/PixDetails/rule-details.js) with `attributes`, `events`, `styles/`

## Common mistakes

| Symptom | Fix |
| ------- | --- |
| `decorator/` or `events/` copied inside a component folder | Move them to a project-shared path; update imports in every component |
| Two `decorator/` installations in different folders | Pick one as canonical, delete the others, update imports |
| Importing helpers from a sibling component (`../OtherComp/...`) | Always import from the central library path |
| Styles applied twice after HMR | Use `componentDecorator` / `registerStylesheet` — never adopt sheets manually in render |
| Listener not removed on detach | Don't store `bound` references; rely on `addEventListener(type, this)` + `handleEvent` (the decorator does this for you) |
| `customElements.define` throws on second import | Decorator skips when `customElements.get(tag)` already returns; never call `define` directly |
| CSS file imported but `styles` is `undefined` | Bundler is treating the file as a CSS module/side-effect import — switch to `bundle-text:` (Parcel) or `?raw` (Vite/webpack) |
| Inline SVG strings in `ComponentName.js` | Move each SVG to `icons/<name>.svg` and import with `bundle-text:./icons/<name>.svg` |
| Constants or helper functions defined in `ComponentName.js` | Move constants to `ComponentName.consts.js`, pure helpers to `ComponentName.utils.js` |
| Customized built-in not upgrading on Safari | Ship the `@ungap/custom-elements` polyfill at app entry |

## See also

- [rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) — Proxy Store, Signals, and the reactive template engine
- [rule-styleguide](../rule-styleguide/SKILL.md) — HTML/CSS/JS conventions (semantics, layers, naming)
- [rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md) — WCAG 2.2 AA requirements for components
- [rule-ui-design-system](../rule-ui-design-system/SKILL.md) — design tokens, layers, and visual direction
- [rule-frontend](../rule-frontend/SKILL.md) — frontend skill index
- [rule](../rule/SKILL.md) — central skill index
