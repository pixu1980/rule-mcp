---
name: rule-styleguide-naming
description: >-
  Use when following rule-mcp naming conventions for files, folders, and exports. Covers PascalCase, camelCase, UPPER_SNAKE_CASE, barrel patterns, and directory layout.
tags:
  - "naming"
  - "conventions"
  - "file-tree"
  - "barrel"
  - "structure"
frameworks: [all]
guardrails: [file-naming]
---

# Naming and File Tree Conventions

## 1. Naming Conventions

### 1.1 Tokens

| Element                                        | Convention         | Example                                          |
| ---------------------------------------------- | ------------------ | ------------------------------------------------ |
| Variables                                      | `camelCase`        | `const userName = '';`                           |
| Functions (non-component)                      | `camelCase`        | `function fetchData() {}`                        |
| Functional components (return `html` template) | `PascalCase`       | `function TodoItem(todo) { return html\`...\` }` |
| Classes                                        | `PascalCase`       | `class TodoItem extends HTMLElement {}`          |
| Constants (all)                                | `UPPER_SNAKE_CASE` | `const MAX_RETRIES = 3;`                         |
| Custom element tag                             | `kebab-case`       | `customElements.define('todo-item', ...)`        |
| CSS custom properties                          | `--kebab-case`     | `--color-primary-500`                            |

```js
// ✅ CORRECT
const userName = "Alice";
const MAX_RETRIES = 3;

function fetchData(url) {
  /* ... */
}

function TodoItem(todo) {
  return html`<div>${todo.title}</div>`;
}

class TodoItem extends HTMLElement {
  static {
    customElements.define("todo-item", this);
  }
}

// ❌ VIOLATION
const UserName = "Alice";
const maxRetries = 3;
class todoItem extends HTMLElement {}
```

### 1.2 File Naming

| Context                                           | Convention             | Example                          |
| ------------------------------------------------- | ---------------------- | -------------------------------- |
| Component/file inside a folder (except `index.*`) | `_PascalCase.ext`      | `_TodoItem.js`, `_TodoItem.css`  |
| Barrel export file                                | `index.ext`            | `index.js`                       |
| Generic utility files (outside components)        | `kebab-case.ext`       | `api-client.js`, `date-utils.js` |
| Test files                                        | `_PascalCase.test.ext` | `_TodoItem.test.js`              |
| Entry point                                       | `index.ext`            | `index.js`, `index.html`         |

### 1.3 File Suffixes (inside component folders)

| Suffix         | Content                             | Example                |
| -------------- | ----------------------------------- | ---------------------- |
| `*.consts.js`  | Constants specific to the component | `_TodoItem.consts.js`  |
| `*.helpers.js` | Utility/helper functions            | `_TodoItem.helpers.js` |
| `*.types.js`   | Type definitions / JSDoc typedefs   | `_TodoItem.types.js`   |

Additional suffixes may be added as needed (`.config.js`, `.data.js`, etc.) following the same pattern.

---

## 2. File Tree Convention

### 2.1 Standard Project Structure

```
project/
├── src/
│   ├── index.html                ← Entry point HTML (UNICO index.html)
│   ├── index.js                  ← Entry point JS (barrel principale)
│   │
│   ├── components/               ← Componenti UI (cartelle PascalCase)
│   │   ├── TodoList/
│   │   │   ├── index.js          ← Barrel (NO prefisso)
│   │   │   ├── _TodoList.js      ← Component (CON prefisso _)
│   │   │   ├── _TodoList.css     ← Styles
│   │   │   ├── _TodoList.consts.js
│   │   │   ├── _TodoList.helpers.js
│   │   │   └── __tests__/
│   │   │       ├── _TodoList.test.js
│   │   │       └── _TodoList.helpers.test.js
│   │   │
│   │   └── TodoItem/             ← Sibling di TodoList (stesso contenitore)
│   │       ├── index.js
│   │       ├── _TodoItem.js
│   │       ├── _TodoItem.css
│   │       └── __tests__/
│   │           └── _TodoItem.test.js
│   │
│   ├── core/                     ← Engine (cartella kebab-case)
│   │   ├── index.js              ← Barrel
│   │   ├── _signal.js            ← File con _
│   │   └── _store.js
│   │
│   ├── helpers/                  ← Utility (cartella kebab-case)
│   │   ├── index.js              ← Barrel
│   │   ├── _addTodo.js           ← File con _
│   │   ├── _formatDate.js
│   │   └── __tests__/
│   │       └── _addTodo.test.js
│   │
│   └── styles/                   ← CSS globali (cartella kebab-case)
│       ├── index.css             ← Barrel (importa tutto)
│       ├── _base.css
│       └── _components.css
│
├── .nvmrc
├── package.json
├── pnpm-lock.yaml
└── README.md
```

### 2.2 Rules

1. **Every component folder** must have an `index.js` barrel that re-exports the public API.
2. **All other files** inside a component folder MUST be prefixed with `_` (underscore).
3. **Non-component folders** (helpers, core, styles) with an `index.*` barrel also use the `_` prefix for non-index files.
4. **Test files** live in a `__tests__/` subfolder and use the `_` prefix.
5. **Sibling components** live in the same parent folder, not nested under each other (e.g. `TodoList/` and `TodoItem/` are siblings under `components/`).
6. **`index.html`** is the only entry point HTML and lives inside `src/`.
7. **Generic non-component files** (utility modules, config, standalone scripts) use `kebab-case.js` naming and live in the appropriate `kebab-case` folder.

### 2.3 Barrel Pattern

```js
// components/TodoItem/index.js
export { TodoItem } from "./_TodoItem.js";
export { TODO_ITEM_DEFAULTS } from "./_TodoItem.consts.js";
export { formatTodoTitle } from "./_TodoItem.helpers.js";
```

```js
// helpers/index.js
export { addTodo } from "./_addTodo.js";
export { formatDate } from "./_formatDate.js";
```

```css
/* styles/index.css */
@import "./_base.css";
@import "./_components.css";
```

### 2.4 Barrel Exception

If a folder has only one meaningful export and no additional files, the barrel may be omitted and the file itself may serve as the entry point - but only for top-level or trivial cases. For components, always use the barrel pattern.

---

## 3. Import Conventions

### 3.1 Import Paths

- Prefer path aliases when the project tooling supports them (Vite, webpack, TypeScript paths).
- Default alias: `@` maps to `src/`.

```js
// ✅ CORRECT: alias import
import { TodoItem } from "@components/TodoItem/index.js";
import { addTodo } from "@helpers/index.js";

// Also acceptable: relative imports for close-proximity files
import { appStore } from "../shared/index.js";
```

- When a project already has its own alias convention, follow the existing one.
- Fall back to relative paths if no alias tooling is configured.

### 3.2 Import Order

Organize imports with blank lines separating groups:

1. Core engine / framework modules
2. Component imports
3. Helper / utility imports
4. Style imports
5. Side-effect imports (registrations)

```js
// 1. Core
import { Store, Signal, html } from "@core/index.js";

// 2. Components
import { TodoItem } from "@components/TodoItem/index.js";

// 3. Helpers
import { addTodo, toggleTodo } from "@helpers/index.js";
import { VISIBLE_FILTERS } from "@components/TodoList/_TodoList.consts.js";

// 4. Styles
import "@styles/index.css";
```

---

## 4. Quick Reference

```
┌───────────────────────────────────────────────────┐
│   PascalCase  →  class, functional component,     │
│                  component file/folder            │
│   camelCase   →  variable, function, property     │
│   UPPER_SNAKE →  constant                         │
│   kebab-case  →  custom element tag, generic file │
│   _ prefix    →  non-index file inside a folder   │
│   index.*     →  barrel export                    │
└───────────────────────────────────────────────────┘
```

---

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) - Style guides index
- [rule-mcp](../rule/SKILL.md) - Central skill index
