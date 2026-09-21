# rule Template Engine reference

The bundled engine resources include:

- `assets/template-engine/index.js`: main `TemplateEngine` class for Node-side rendering
- `assets/tagged-runtime/index.js`: browser-safe tagged template runtime for custom elements and other browser bundles
- `renderer/`: DOM-based renderer by phase (preprocess, render, walk, text, directives)
- `expression-parser/`: expression parsing and evaluation (parse, path, js, evaluate)
- `filters/`: built-in filters by family (text, markdown, date, collection, value) and custom filter hooks
- `tests/*.test.js`: functional tests for directives and rendering behavior

## Supported directives and features

- `{{ expression }}` interpolation
- inline tagged template literal rendering with `engine.template` and `engine.html`
- filter pipelines
- `<if condition="...">`
- `<for each="item in items">`
- `<switch expr="...">`, `<case>`, `<default>`
- `<include src="...">`
- `<extends src="...">` with `<block name="...">`

## Recommended project layout after install

- `src/template-engine/` for engine and tests
- `examples/template-engine/` for runnable usage samples

## Typical integration points

- static build scripts (`node scripts/build-static.mjs`)
- SSG generation step in build pipeline
- SSR route handlers that render templates per request
- small inline templates in build/runtime modules through `engine.html`
- reusable component-like render functions composed with tagged template literals

## Usage examples

- File template, static HTML: `assets/examples/static-html/build-static.mjs`
- File template, SSG: `assets/examples/ssg/build-site.mjs`
- File template, SSR: `assets/examples/ssr/server.mjs`
- Tagged template literal: `assets/examples/tagged-template-literal/render-inline.mjs`
- Tagged component-style rendering: `assets/examples/tagged-template-literal/render-components.mjs`

## Test coverage

- General engine behavior: `assets/template-engine/tests/core.test.js`
- Tagged template literal behavior: `assets/template-engine/tests/tagged-template-literal.test.js`
- Directives, inheritance, filters, renderer, and SEO head behavior: other files in `assets/template-engine/tests/`

## Tagged template literal API

Use `engine.template` or `engine.html` as a tagged template literal. The full engine supports `{{ ... }}` expressions and directives. The browser-safe tagged runtime supports JavaScript `${...}` interpolations only.

### Minimal inline template

```js
import TemplateEngine from "./src/template-engine/index.js";

const engine = new TemplateEngine();
const renderList = engine.html`
  <h1>{{ title }}</h1>
  <for each="item in items">
    <span>{{ item }}</span>
  </for>
`;

const html = renderList({
  title: "Links",
  items: ["Docs", "API"],
});
```

### Composition with reusable fragments

Tagged templates can compose other tagged render functions. Interpolated functions receive the current render data.

```js
const renderHeader = engine.html`
  <header>
    <h1>{{ page.title }}</h1>
    <p>{{ page.description }}</p>
  </header>
`;

const renderPage = engine.template`
  ${renderHeader}
  <main>
    <ul>
      <for each="item in items">
        <li>{{ item.label }}: {{ item.value }}</li>
      </for>
    </ul>
  </main>
`;
```

Interpolations run before directive handling. Do not place a tagged render function inside `<for>` expecting it to receive loop-scoped data; use template directives for loop items or map data inside a JavaScript interpolation.

Run the bundled example after installing with examples:

```bash
node examples/template-engine/tagged-template-literal/render-inline.mjs
node examples/template-engine/tagged-template-literal/render-components.mjs
```

`render-inline.mjs` output contains:

- `<h1>Inline report</h1>`
- three `<li>` entries rendered by `<for>`
- `<script type="application/json" id="page-data">`

`render-components.mjs` output contains:

- two `<article>` entries
- badge fragments rendered by reusable tagged functions
- `data-kind` values transformed through filters

### JavaScript interpolation

Prefer `{{ value }}` for normal template data, filters, and escaping. Use `${...}` for static fragments, reusable render functions, or computed markup that cannot be expressed as a template directive. JavaScript `${...}` interpolations are joined into the template source before rendering. If an interpolation is a function, it receives the render data:

```js
const renderPage = engine.html`
  <main>{{ title }}</main>
  ${(data) => `<footer>${data.year}</footer>`}
`;
```

### File templates vs tagged templates

Use file templates when markup is shared across pages, uses `include` or `extends`, or belongs in a designer-editable template file. Use tagged templates when markup is small, component-like, generated inside code, or easiest to keep near data preparation.

## Dependency note

The full bundled renderer uses `jsdom`, and Markdown filters use `marked`. Ensure target project has both available in dependencies or devDependencies when using `assets/template-engine/`.
The browser-safe tagged runtime in `assets/tagged-runtime/` has no Node-only runtime dependencies and is the correct choice for custom-element/browser bundles.
