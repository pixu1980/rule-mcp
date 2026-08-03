---
name: rule-styleguide-javascript
description: >-
  Use when writing JavaScript or TypeScript following rule conventions. Covers naming, functions, classes, async patterns, modern idioms (Set.has, for...of, node: protocol, replaceAll, flatMap), DOM manipulation, and custom elements.
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

> **See also:** [`naming-and-file-tree.md`][rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) for naming conventions (PascalCase, camelCase, UPPER_SNAKE_CASE), file `_` prefix rules, and project structure.

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
  methodName(argOne = false, argTwo = '') {
    const localVar = 0;
  }
}
```

## Strict mode

* Always use `'use strict'` as the first line of every JS file.

```js
'use strict';
```

## Dangerous features

* Never use `eval()`.
* Never use `with`.
* Never update native Object prototypes (Date, Array, Object).
* Never pass a string to `setTimeout` or `setInterval`.

## Functions and declarations

* Prefer function expressions over function declarations (avoid hoisting surprises).

```js
// PREFERRED
export const add = function (a, b) { return a + b; };

// AVOID
export function add(a, b) { return a + b; }
```

* Prefer arrow functions to avoid `this` binding issues.

```js
// PREFERRED
const add = (a, b) => a + b;

// AVOID
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

* Prefer short-circuit expressions over trivial `if` blocks:
  * ✅ `condition && doThing()`
  * ✅ `condition || fallback()`
* Use early returns to reduce nesting.
* Keep ternaries simple. Two nested ternaries is the limit.
* Always have a `default` case for `switch` statements.

### Blank lines around control structures

* Add a blank line before `if`, `for`, `while`, `switch`, `try` blocks when preceded by other statements.
* Add a blank line after the closing brace when followed by other statements.

```js
// PREFERRED
const items = getItems();

if (items.length === 0) {
  return;
}

for (const item of items) {
  process(item);
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
    console.error('Fetch failed:', error);
  }
}
```

## Loops and iteration

* Prefer `for...of` over `.forEach()` — always. `for...of` gives better TypeScript narrowing, lets you `await` directly, and supports `break`/`continue` (none of which work cleanly inside a `.forEach()` callback).
* Use `for...of` for iterating values. Avoid `for...in`.
* Avoid nesting or chaining loops when possible.
* For membership checks inside a loop, prefer `Set.prototype.has()` over `Array.prototype.includes()`: `.includes()` rescans the whole array per call (O(n²) in a loop), while `Set.has()` is roughly constant-time.

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

## Truthy, falsy, and conditionals

* Be specific in checks. Don't rely on truthy/falsy for edge cases.
* Prefer ternary over logical `||` and `&&` for value selection.
* Prefer a ternary over a simple `if/else` that only returns or assigns a value — it avoids `let` and lets `prefer-const` flag the variable.

```js
// PREFERRED
function status(ok) {
  return ok ? 'pass' : 'fail';
}

// AVOID
function status(ok) {
  if (ok) {
    return 'pass';
  } else {
    return 'fail';
  }
}
```

## Modern JS/TS idioms (enforced by eslint-plugin-unicorn)

These are the correctness and performance idioms rule expects in every JS/TS file. They map 1:1 to `eslint-plugin-unicorn` rules in the `recommended` preset (see [rule-toolchain-eslint](../rule-toolchain-eslint/SKILL.md)); all of them are autofixable with `pnpm eslint . --fix`.

| Idiom | ❌ Avoid | ✅ Prefer | Why |
|-------|---------|-----------|-----|
| Set membership in loops | `allowed.includes(scope)` inside `.filter()`/loops | `new Set([...])` + `allowed.has(scope)` | `.includes()` is O(n) per call → O(n²) in loops; `Set.has()` is O(1) |
| Iteration | `users.forEach(u => sendEmail(u))` | `for (const u of users) { sendEmail(u); }` | `break`/`continue`/`await` + better TS narrowing |
| Node builtins | `import fs from 'fs'` | `import fs from 'node:fs'` | Unambiguous; can't be shadowed by an npm package |
| Throwing errors | `throw Error('boom')` | `throw new Error('boom')` | Consistency; `new` required for error constructors |
| Global string replace | `str.replace(/-/g, ' ')` | `str.replaceAll('-', ' ')` | Clearer intent, no regex escaping |
| Nested array flatten | `rows.map(r => r.cells).flat()` | `rows.flatMap(r => r.cells)` | No intermediate array allocation |
| Builtin constructors | `const cache = Map()` | `const cache = new Map()` | `new` required for `Map`/`Set`/`Date`/`Array`/`WeakMap`/`WeakSet` (`String`/`Number`/`Boolean`/`Symbol`/`BigInt` are exempt) |
| Regex | `/[0-9]/` | `/\d/` | Shorter, consistent |

> Tuning: `prevent-abbreviations`, `no-null`, `no-array-reduce`, and `filename-case` are opinionated — scope them per project (`warn` or `ignore` options) instead of fighting the codebase.

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
import { i18n } from '../../services/i18nService.js';

// 2. Bundle-text imports
import * as styles from 'bundle-text:./MyComponent.css';

// 3. Side-effect imports
import '../OtherComponent/OtherComponent.js';

// 4. Data imports
import enTranslations from 'bundle-text:../../../assets/i18n/en.json';
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

## Testing — Playwright + axe-core (MANDATORY)

> **Every project MUST have automated tests using Playwright, with mandatory a11y coverage via @axe-core/playwright.**
> No exceptions. CI MUST fail on a11y violations.

### Required Test Files

```
tests/
  a11y/
    _basic.spec.js        # Page structure: landmarks, headings, language, global axe
    _forms.spec.js        # Form inputs, labels, error associations
    _navigation.spec.js   # Keyboard nav, focus management
    _components.spec.js   # Per-component a11y checks (custom elements, shadow DOM)
  playwright.config.js    # Shared Playwright configuration
```

### Setup

```bash
pnpm install --save-dev playwright @axe-core/playwright
ppnpx playwright install chromium
```

### Required `playwright.config.js`

```js
/**
 * @module tests/playwright.config
 *
 * Shared Playwright configuration. Uses Chromium by default.
 * All a11y tests run against a local dev server.
 */

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./a11y",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Required a11y Tests

**`tests/a11y/_basic.spec.js`** — page-level structure:

```js
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("A11y: basic page structure", () => {
  test("page has no auto-detected a11y violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
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
