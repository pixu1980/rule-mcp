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

## Optional chaining and nullish coalescing

```js
const fallbackArg = arg ?? '';
const value = obj?.nested?.property ?? defaultValue;
```

## Async

* Prefer promises over callbacks.
* Always `try...catch` JSON methods (`JSON.parse`, `JSON.stringify`).
* Prefer `async/await` for readability.

```js
async function fetchData(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}
```

## Loops and iteration

* `for` loops > `.forEach` when you need `break` or `continue`.
* Use `for...of` for iterating values. Avoid `for...in`.
* Avoid nesting or chaining loops when possible.

## Strings

* Prefer template strings.

```js
const greeting = `Hello, ${name}!`;
```

## Readability, style, and tooling

* Use 2-space indentation.
* Use trailing commas where allowed.
* Add semicolons. Always.
* Readable > performance unless you truly need performance.
* Avoid weird unreadable hacks.

### `"use strict"` — followed by blank line

```js
// ✅ CORRECT
"use strict";

import { x } from "./x.js";
```

### Class methods — always multi-line body, blank line between

Every method body must be multi-line (even if one statement).
Every pair of methods must have a blank line between them.

```js
// ✅ CORRECT
export class Example {
  constructor() {
    this.x = 1;
    this.y = 2;
  }

  methodOne() {
    return this.x;
  }

  methodTwo() {
    if (this.x) {
      return;
    }
  }
}

// ❌ FORBIDDEN — single-line constructor
constructor() { this.x = 1; this.y = 2; }

// ❌ FORBIDDEN — single-line method body
methodOne() { return this.x; }

// ❌ FORBIDDEN — no blank line between methods
methodOne() {
  return this.x;
}
methodTwo() {}
```

### `for`, `for...of`, `for...in` — braces + multi-line

Every loop body MUST use `{}` and span multiple lines, even for
single statements.

```js
// ✅ CORRECT
for (const u of this.deps.values()) {
  u();
}

// ❌ FORBIDDEN
for (const u of this.deps.values()) u();
```

### Arrow functions with body — always use `{}` + multi-line

Arrow functions that execute statements MUST use `{}` with the body
on separate lines, even for a single statement.

```js
// ✅ CORRECT
withCollector(this, () => {
  this.fn();
});

// ✅ CORRECT — returning an arrow function
return () => {
  this.subscribers.delete(fn);
};

// ❌ FORBIDDEN — single-line arrow body
withCollector(this, () => this.fn());
return () => this.subscribers.delete(fn);
```

### `try`, `catch`, `finally` — preceded by blank line

```js
// ✅ CORRECT
pushCollector(collector);

try {
  return fn();
} finally {
  popCollector();
}

// ❌ FORBIDDEN — no blank line before try
pushCollector(collector);
try { }
```

### Exported declarations — separated by blank line

```js
// ✅ CORRECT
export function a() {
  return 1;
}

export function b() {
  return 2;
}
```

### `return` — MUST have blank line before

Every `return` statement MUST be preceded by a blank line, unless it is
the first statement in a block (immediately after `{`).

```js
// ✅ CORRECT
function fn() {
  const x = compute();

  return x;
}

if (condition) {
  return;
}

next();

// ❌ FORBIDDEN — no blank line before return
function fn() {
  const x = compute();
  return x;
}
```

### Trailing blank line at end of file — MANDATORY

Every JS file MUST end with a blank line (newline at end of last line + empty line).

### `'use strict'` and imports — always double quotes

Use double quotes for ALL strings: `'use strict'` → `"use strict"`.
Single quotes are forbidden in string literals.

```js
// ✅ CORRECT
"use strict";
import { x } from "./x.js";
const msg = "hello";

// ❌ FORBIDDEN
'use strict';
import { x } from './x.js';
const msg = 'hello';
```

Template literals (backticks) remain unchanged: `` `hello ${name}` ``

### Arrow functions — body always uses `{}`, params always use `()`

Every arrow function that has a body MUST use `{}` with a `return` statement
when a value is produced. Even for single expressions.
Single arrow params MUST use parentheses.

```js
// ✅ CORRECT
const fn = () => {
  return doThing();
};

const fn2 = (x) => {
  return x * 2;
};

.catch((err) => {
  console.warn(err);
});

// ❌ FORBIDDEN — bare expression
const fn = () => doThing();

// ❌ FORBIDDEN — no parens on single param
.catch(err => { console.warn(err); });
```

### Blank line after closing `}` of `if`/`for`/`while` blocks

When an `if`, `for`, or `while` block is followed by another statement,
there MUST be a blank line after the closing `}`.

```js
// ✅ CORRECT
if (condition) {
  doThing();
}

doNext();

// ❌ FORBIDDEN — no blank line after }
if (condition) {
  doThing();
}
doNext();
```

### Blank line between variable declaration and next statement

When a `const`/`let` declaration is followed by a block (if/for/while)
or another statement, there MUST be a blank line between them.

```js
// ✅ CORRECT
const origConnected = component.prototype.connectedCallback;

component.prototype.connectedCallback = function () {
  ...
```

### No double blank lines anywhere

Multiple consecutive blank lines are forbidden. Always exactly one.

```js
// ❌ FORBIDDEN — double blank line
}


function next()

// ✅ CORRECT
}

function next()
```

## Reference

Load references/REFERENCE.md for JS/TypeScript safety patterns, DOM/Custom Elements, JSDoc standards, and testing guide.
