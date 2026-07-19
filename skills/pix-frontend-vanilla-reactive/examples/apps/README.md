# Example Apps — pix-vanilla-reactive

Four standalone apps demonstrating the 2 component patterns + 1 variant.

## Quick Start

Serve this directory with any HTTP server (Vite, npx serve, python -m http.server).
ES modules don't work with `file://`.

```bash
npx serve .
# then open http://localhost:3000/apps/vr-component/
```

## Apps

| App | Pattern | What it shows |
|-----|---------|---------------|
| `vr-component/` | **CustomElement vrComponent** | `vrComponent()` decorator, methods as `@click` handlers, `context()` + `render()` |
| `fn-component/` | **Functional Component** | Plain functions returning `html\`\``, `result._scope` + `result._context`, mounted via `effect()` |
| `vr-component-with-html/` | **CustomElement vrComponent with External HTML** | External `.template.html` loaded via `fetch`, `html(str)`, `<switch>`, `<if>/<else>` |
| `combo/` | **All mixed** | `<todo-app>` (CustomElement vrComponent) uses `{{ TodoStats(ctx) }}` (Functional Component) and `<todo-header>` (CustomElement vrComponent with External HTML) |

## Shared Core

All apps import the shared engine from `../../src/core/index.js`:
```
examples/src/core/    ← signals, store, template-engine, decorator
```

Edit core files there to affect all apps at once.
