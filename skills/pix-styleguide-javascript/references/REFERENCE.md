## Truthy, falsy, and conditionals

* Be specific in checks. Don't rely on truthy/falsy for edge cases.
* Prefer ternary over logical `||` and `&&` for value selection.

## Types and safety

* Use TypeScript when possible.
* Never trust data you don't create. Validate user or API input before operating.

## DOM and Custom Elements

* Attach listeners in `connectedCallback()` and clean up in `disconnectedCallback()`.
* Keep rendering logic in `render()` and make it idempotent.

### Import order

Organize imports with blank lines separating groups:

1. Services and utilities (local modules)
2. Bundle-text imports (CSS and HTML templates)
3. Side-effect imports (component registrations)
4. Data imports (JSON, translations)

```js
// 1. Services and utilities
import { i18n } from "../../services/i18nService.js";

// 2. Bundle-text imports
import * as styles from "bundle-text:./MyComponent.css";

// 3. Side-effect imports
import "../OtherComponent/OtherComponent.js";

// 4. Data imports
import enTranslations from "bundle-text:../../../assets/i18n/en.json";
```

### Static initialization block pattern

* Use static initialization blocks for stylesheet registration and custom element definition.

```js
class MyComponent extends HTMLElement {
  static hasRegisteredStyle = false;

  static {
    if (!MyComponent.hasRegisteredStyle) {
      registerStylesheet(styles);
      MyComponent.hasRegisteredStyle = true;
    }

    !customElements.get('my-component') && customElements.define('my-component', MyComponent);
  }
}
```

## Global access

* Prefer `globalThis` for global access.

## Regex

* Use regex for string manipulation instead of index-based manipulation.

## IIFE and utilities

* IIFE is useful for early setup before the rest of the code runs.
* Turn repeated logic into small generic utility functions.

## Documentation — JSDoc (MANDATORY)

> **Every JS/TS file MUST have complete JSDoc.** No exceptions.
> This rule is enforced by rule guardrails (`pix_check` includes `jsdoc-required`).

### Rules

1. **Every exported symbol** (function, class, constant, type) MUST have a JSDoc block.
2. **Every module** MUST have a file-level JSDoc `@module` or description at the top.
3. **Every function** (exported or internal) MUST have JSDoc describing purpose, parameters, and return value.
4. **Every class** MUST have JSDoc describing its purpose and usage.
5. **Every type/interface** (TS) MUST have JSDoc.

### JSDoc Format

```js
/**
 * Brief description of what this does. Start with a verb.
 * Use a second paragraph for additional context if needed.
 *
 * @param {Type} paramName — Description of param
 * @param {Type} [optionalParam] — Description with default
 * @returns {Type} — Description of return value
 */
export function myFunction(paramName, optionalParam = "default") {
  // ...
}
```

### Module-level JSDoc

```js
/**
 * @module path/to/module
 *
 * Brief description of the module's purpose.
 * What it provides, how it fits in the architecture.
 */
```

### Component JSDoc (React / Solid / etc.)

```js
/**
 * TodoItem component.
 *
 * Renders a single todo item with toggle and delete controls.
 * Follows rule principles: zero CSS classes, semantic HTML.
 *
 * @param {{ todo: Todo, onToggle: (id: string) => void, onDelete: (id: string) => void }} props
 * @returns {JSX.Element}
 */
export function TodoItem({ todo, onToggle, onDelete }) {
  // ...
}
```

### Class JSDoc (Custom Elements)

```js
/**
 * @element todo-item
 *
 * Custom element for rendering a todo item.
 * Uses adoptedStyleSheets for styling, data-part selectors for children.
 *
 * @attr {boolean} completed — Whether the todo is done
 * @attr {string} todo-id — Unique identifier
 * @fires toggle — When checkbox changes
 */
export class TodoItem extends HTMLElement {
  // ...
}
```

### Internal (non-exported) functions

Even private/helper functions MUST have JSDoc. One line is acceptable for obvious ones:

```js
/** Returns a formatted date string for display. */
function formatDate(date) { ... }
```

### Enforcement

- The `pix_check` tool validates JSDoc presence on all exported symbols.
- Run `pix_<skill> mode=check` on your code to verify documentation compliance.
- **CI MUST fail** if any JS/TS file lacks required JSDoc.

### Documenting CSS

For CSS file documentation rules, see [`css.md`][rule-styleguide-css](../rule-styleguide-css/SKILL.md) → Documentation section.

ze();
    expect(results.violations).toEqual([]);
  });

  test("page has one <h1>", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("headings don't skip levels", async ({ page }) => {
    await page.goto("/");
    const levels = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
        .map(h => parseInt(h.tagName[1], 10))
    );
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  test("page has <main> landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toBeAttached();
  });

  test("html has lang attribute", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang");
  });
});
```

**`tests/a11y/_forms.spec.js`** — form a11y:

```js
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("A11y: forms", () => {
  test("axe violations after form interaction are zero", async ({ page }) => {
    await page.goto("/contact");
    // Fill with invalid data to trigger errors
    await page.locator("input[name='email']").fill("bad");
    await page.locator("button[type='submit']").click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

**`tests/a11y/_components.spec.js`** — component-level (shadow DOM):

```js
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("A11y: components", () => {
  test("todo-item has no a11y violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .include("todo-item")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
```

### Running Tests

```bash
# Run all tests
ppnpx playwright test

# Run only a11y tests
ppnpx playwright test tests/a11y/

# Single test file
ppnpx playwright test tests/a11y/_basic.spec.js

# With UI mode (debugging)
ppnpx playwright test --ui
```

### CI Integration

```yml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: ppnpx playwright install chromium
      - run: ppnpx playwright test
```

### axe-core Tags Reference

Filter axe rules by WCAG level:

```js
new AxeBuilder({ page })
  .withTags(["wcag2aa", "wcag21aa", "wcag22aa"])
  .analyze();
```

| Tag | WCAG Level |
|-----|-----------|
| `wcag2aa` | WCAG 2.0 Level AA |
| `wcag21aa` | WCAG 2.1 Level AA |
| `wcag22aa` | WCAG 2.2 Level AA (latest) |
| `best-practice` | Common a11y best practices |
| `section508` | US Section 508 |

### Grounds for Failure (CI MUST Reject)

- ❌ Missing `tests/a11y/` directory
- ❌ Missing `playwright.config.js`
- ❌ No axe-core scan (no `@axe-core/playwright` import)
- ❌ Tests pass despite violations (`expect(results.violations).toEqual([])` must fail on a11y issues)
- ❌ Tests skipped with `.skip` or `.only` without documented reason
- ❌ A11y testing replaced with manual-only review
- ❌ Missing CI workflow file that runs a11y tests

### Enforcement

- The `pix_check` tool validates: `tests/a11y/` exists, axe-core import present, `playwright.config.js` exists.
- Run `pix_<skill> mode=check` on your project to verify testing compliance.
- See [`a11y.md`][rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md) → Section 12 for full a11y testing guide.

## Project scaffolding reminders

* Keep the zero-runtime-dependencies promise. Use native browser APIs.
* Keep each custom element self-contained: render in `render()`, set up listeners in `connectedCallback()`, clean up in `disconnectedCallback()`.
* Export pure logic from separate modules and wire it from components.
* **Documentation is NOT optional.** Every JS/TS file needs JSDoc. Every CSS file needs clear comments.
* **Testing is NOT optional.** Every project needs Playwright + axe-core a11y tests.


---

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) — Style guides index
- [rule](../rule/SKILL.md) — Central skill index
## Reference

See `references/TESTING.md` for detailed reference material — load when you need specific API details, syntax, or advanced examples.


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
