# Example Apps — pix-vanilla-reactive

Four standalone apps demonstrating the 3 component patterns and their composition.

## Quick Start

Serve this directory with any HTTP server (Vite, npx serve, python -m http.server).
ES modules don't work with `file://`.

```bash
npx serve .
# then open http://localhost:3000/apps/a-vrComponent/
```

## Apps

| App | Pattern | What it shows |
|-----|---------|---------------|
| `a-vrComponent/` | **A** only | `vrComponent()` decorator, methods as `@click` handlers, `context()` + `render()` |
| `b-functional/` | **B** only | Plain functions returning `html\`\``, `result._scope` + `result._context`, mounted via `effect()` |
| `c-external-html/` | **C** only | External `.template.html` loaded via `fetch`, `html(str)`, `<switch>`, `<if>/<else>` |
| `combo/` | **A + B + C** | `<todo-app>` (A) uses `{{ TodoStats(ctx) }}` (B) and `<todo-header>` (C). `<for>` loop in A. |

## Shared Core

All apps import the shared engine from `../../src/core/index.js`:
```
examples/src/core/    ← signals, store, template-engine, decorator
```

Edit core files there to affect all apps at once.
