# rule Vanilla Reactive — VS Code Extension

Syntax highlighting + snippets for `rule-vanilla-reactive` template syntax.

## Features

### 1. `html\`\`` inside JS/TS — highlighted as HTML

```js
const result = html`
  <section data-part="card">
    <h2>{{ title | upper }}</h2>
    <button @click="handleSave(id)">Save</button>
  </section>
`;
```

Without the extension, this is plain green text. With it, HTML tags, `{{ }}`,
`@click`, and `data-part` attributes are all syntax-highlighted.

### 2. `.template.html` files — full language support

```html
<section data-part="card">
  <h2>{{ name | upper }}</h2>
  <for each="todo in todos">
    <article>{{ todo.title }}</article>
  </for>
  <if condition="todos.length === 0">
    <p>No items.</p>
  </if>
</section>
```

Files with `.template.html` extension get proper HTML highlighting PLUS:
- `<for>`, `<if>`, `<elseif>`, `<else>`, `<switch>`, `<case>` — keyword colors
- `{{ expr | filter }}` — expression highlighting with filter recognition
- `@click`, `@submit`, etc. — event attribute colors
- `data-part` — attribute recognition

### 3. Snippets

| Prefix | Expansion |
|--------|-----------|
| `html` | `html\`\`` tagged template |
| `rule-component` | Full component class with vrComponent |
| `rule-fn` | Functional component stub |
| `rule-effect` | Effect mount with Store + render |
| `rule-for` | `<for each="item in items">` |
| `rule-if` | `<if condition="">` |
| `rule-ifelse` | `<if>/<else>` block |
| `rule-switch` | `<switch>/<case>/<default>` |
| `rule-click` | `@click="handler()"` |
| `rule-expr` | `{{ expr }}` |
| `rule-filter` | `{{ expr \| upper }}` |
| `data-part` | `data-part="role"` |

## Installation

### From VSIX

```bash
cd extensions/vscode-rule
npx vsce package
code --install-extension rule-vanilla-reactive-0.1.0.vsix
```

### From source (development)

```bash
cd extensions/vscode-rule
npm install -g vsce
vsce package
code --install-extension *.vsix
```

## Requirements

- VS Code 1.85+ or any Cursor version

## What it highlights

| Construct | Color | Example |
|-----------|-------|---------|
| `<for>`, `<if>`, `<switch>` | Keyword | `<for each="x in xs">` |
| `{{ }}` expressions | Variable | `{{ title \| upper }}` |
| Filter names | Support | `\| raw`, `\| upper`, `\| slugify` |
| `@event` attributes | Event | `@click="fn"` |
| `data-part` | Attribute | `data-part="card"` |
| HTML tags | Built-in | `<section>`, `<h1>` |
