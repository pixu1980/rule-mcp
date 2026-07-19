# Example Apps — pix-vanilla-reactive

Four standalone apps demonstrating the component patterns.

## Quick Start

```bash
npx serve .
# open http://localhost:3000/apps/vr-component/
```

ES modules don't work with `file://`.

## Apps

| Directory | Pattern | Structure |
|-----------|---------|-----------|
| `vr-component/` | CustomElement vrComponent | `_App.js` — single class with Store + vrComponent |
| `fn-component/` | Functional Component | `_App.js` — pure functions + effect() mount |
| `vr-component-html/` | CustomElement vrComponent + ext. HTML | `_App.js` + `_Card.template.html` via `loadTemplate()` |
| `combo/` | All mixed | `_App.js` + `components/TodoHeader/` (sub-component) |

## All apps share

| Feature | How |
|---------|-----|
| Store | `new Store(data)` — auto-creates `store.tick` |
| tickState | Automatic on `store.state.X = Y` mutation |
| Template loading | `loadTemplate(import.meta.url, './file.html')` |
| Core engine | Shared from `../../src/core/` |
