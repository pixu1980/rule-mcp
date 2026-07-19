---
name: rule-styleguide-javascript
description: >-
  Use when writing JavaScript or TypeScript following rule conventions. Covers naming, functions, classes, async patterns, DOM manipulation, and custom elements.
tags:
  - "javascript"
  - "ecmascript"
  - "naming"
  - "functions"
  - "async"
  - "modules"
frameworks: [all]
---

# JavaScript Style Guide and Standards

> **See also:** [`naming-and-file-tree.md`][rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) for naming conventions (`PascalCase`, `camelCase`, `UPPER_SNAKE_CASE`), file `_` prefix rules, and project structure.

## General

* Prefer `const` and `let` over `var`. Use `const` until the code really requires `let`.
* Favor pure functions for core logic. Ensure functions do not mutate data they are called with.
* Keep functions small and focused — one function, one responsibility.

## Naming and conventions

* Use `camelCase` for variables, functions, properties, everything except class names.
* Use `PascalCase` for class names.
* Avoid numbers in names. If you need `fn2`, rename to something descriptive.
* Put effort into naming. If it is hard to name, the concept probably has too many responsibilities.

```js
class ClassName extends BaseClassName {
  methodName(argOne = false, argTwo = "") {
    const localVar = 0;
  }
}
```

## Strict mode

* Always use `"use strict"` as the first line of every JS file.

```js
"use strict";
```

## Dangerous features

* Never use `eval()`.
* Never use `with`.
* Never update native Object prototypes (Date, Array, Object).
* Never pass a string to `setTimeout` or `setInterval`.

## Functions and declarations

* Prefer function expressions over function declarations (avoid hoisting surprises).

```js
// PREFERRED — arrow function with multi-line body
export const add = (a, b) => {
  return a + b;
};

// AVOID — function declaration (hoisting), single-line body
function add(a, b) { return a + b; }
```

* Prefer arrow functions to avoid `this` binding issues.

```js
// PREFERRED
const add = (a, b) => {
  return a + b;
};

// AVOID — bare expression arrow
const add = (a, b) => a + b;

// AVOID — function keyword
const add = function (a, b) { return a + b; };
```

* Prefer the rest operator (`...args`) over `arguments`.

## Classes and instantiation

* Prefer `class` over constructor (prototype) functions.

## Data handling

* Use destructuring.
* Only work with the data you need.
* Always use `===`. Triple equals checks value and type.
* Avoid global variables unless you are creating a library.
* Always initialize declarations. Never set `undefined` explicitly — use `null` instead.
* Use default values when possible.

## Control flow

### `if` — braces are MANDATORY, blocks MUST be multi-line

Every `if`, `else`, `else if` **MUST** use braces `{}`. No exceptions.
Single-line `if` without braces is forbidden.

Furthermore, the braces MUST be on separate lines — no inline blocks:

```js
// ✅ CORRECT
if (condition) {
  doThing();
}

// ✅ CORRECT — short-circuit is fine (no if keyword)
condition && doThing();

// ❌ FORBIDDEN — no braces
if (condition) doThing();

// ❌ FORBIDDEN — inline block
if (condition) { doThing(); }
```

Same rule applies to ALL blocks: `for`, `while`, `switch`, `try`, `catch`,
`finally`, arrow functions, promises, method chains. Every set of `{}`
must span multiple lines.

### Blank lines around blocks (MANDATORY)

All blocks that span more than one line MUST have a blank line above and
below them (when possible). This includes:

- `if` / `else` / `else if`
- `for` / `for...of` / `for...in`
- `while` / `do...while`
- `switch` / `case`
- `try` / `catch` / `finally`
- `return` statements spanning multiple lines
- Promise chains (`.then().catch().finally()`)
- Method chains spanning multiple lines
- Arrow functions assigned to variables (if multi-line body)

**Exception:** blocks at the very start or end of a parent block may omit
the adjacent blank line.

### Empty lines inside blocks — FORBIDDEN

No blank line immediately after `{` and no blank line immediately before `}`.

```js
// ❌ FORBIDDEN — blank lines inside block
if (condition) {

  doThing();

}

// ✅ CORRECT
if (condition) {
  doThing();
}
```

```js
// ✅ CORRECT
const items = getItems();

if (items.length === 0) {
  return;
}

items
  .filter(item => item.active)
  .map(item => item.name);

function process() {
  const result = compute();

  if (result.error) {
    return;
  }

  return result.value;
}

// ✅ CORRECT — at start of parent block, no blank line above if
function init() {
  if (!ready) return;

  start();
}
```

### Variable declarations — grouped at top

`const`, `let`, `var` declarations SHOULD be grouped together at the top
of their scope, separated from the rest of the code by a blank line.

```js
// ✅ CORRECT
function process(items) {
  const count = items.length;
  const threshold = 10;

  if (count > threshold) {
    return;
  }

  items.forEach(item => process(item));
}
```

### Short-circuit for registration and guards

```js
// Custom element registration
!customElements.get('my-component') && customElements.define('my-component', MyComponent);

// Optional chaining guard
element && element.remove();
callback?.();
```

## Reference

See references/REFERENCE.md for JS optional chaining, async, loops, strings, and all formatting/style rules.
