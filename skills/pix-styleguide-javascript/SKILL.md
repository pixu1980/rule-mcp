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
guardrails:
  [
    js-array-flat-map,
    js-blank-line-before-return,
    js-blank-line-between-methods,
    js-blank-lines-blocks,
    js-const-top,
    js-for-loop-braces,
    js-if-braces,
    js-new-for-builtins,
    js-no-array-for-each,
    js-no-blank-lines-in-blocks,
    js-no-inline-blocks,
    js-node-protocol,
    js-prefer-replace-all,
    js-prefer-set-has,
    js-single-line-method,
    js-throw-new-error,
  ]
---

# JavaScript Style Guide and Standards

> **See also:** [`naming-and-file-tree.md`][rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) for naming conventions (PascalCase, camelCase, UPPER_SNAKE_CASE), file `_` prefix rules, and project structure.

## General

- Prefer `const` and `let` over `var`. Use `const` until the code really requires `let`.
- Favor pure functions for core logic. Ensure functions do not mutate data they are called with.
- Keep functions small and focused - one function, one responsibility.

## Naming and conventions

- Use `camelCase` for variables, functions, properties, everything except class names.
- Use `PascalCase` for class names.
- Avoid numbers in names. If you need `fn2`, rename to something descriptive.
- Put effort into naming. If it is hard to name, the concept probably has too many responsibilities.

```js
class ClassName extends BaseClassName {
  methodName(argOne = false, argTwo = "") {
    const localVar = 0;
  }
}
```

## Strict mode

- Always use `'use strict'` as the first line of every JS file.

```js
"use strict";
```

## Dangerous features

- Never use `eval()`.
- Never use `with`.
- Never update native Object prototypes (Date, Array, Object).
- Never pass a string to `setTimeout` or `setInterval`.

## Functions and declarations

- Prefer function expressions over function declarations (avoid hoisting surprises).

```js
// PREFERRED
export const add = function (a, b) {
  return a + b;
};

// AVOID
export function add(a, b) {
  return a + b;
}
```

- Prefer arrow functions to avoid `this` binding issues.

```js
// PREFERRED
const add = (a, b) => a + b;

// AVOID
const add = function (a, b) {
  return a + b;
};
```

- Prefer the rest operator (`...args`) over `arguments`.

## Classes and instantiation

- Prefer `class` over constructor (prototype) functions.

## Data handling

- Use destructuring.
- Only work with the data you need.
- Always use `===`. Triple equals checks value and type.
- Avoid global variables unless you are creating a library.
- Always initialize declarations. Never set `undefined` explicitly - use `null` instead.
- Use default values when possible.

## Control flow

- Prefer short-circuit expressions over trivial `if` blocks:
  - ✅ `condition && doThing()`
  - ✅ `condition || fallback()`
- Use early returns to reduce nesting.
- Keep ternaries simple. Two nested ternaries is the limit.
- Always have a `default` case for `switch` statements.

### Blank lines around control structures

- Add a blank line before `if`, `for`, `while`, `switch`, `try` blocks when preceded by other statements.
- Add a blank line after the closing brace when followed by other statements.

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
!customElements.get("my-component") && customElements.define("my-component", MyComponent);

// Optional chaining guard
element && element.remove();
callback?.();
```

## Optional chaining and nullish coalescing

```js
const fallbackArg = arg ?? "";
const value = obj?.nested?.property ?? defaultValue;
```

## Async

- Prefer promises over callbacks.
- Always `try...catch` JSON methods (`JSON.parse`, `JSON.stringify`).
- Prefer `async/await` for readability.

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

### What await actually waits for: promises, callbacks, streams

`await` waits for one promise to settle. It does not wait for the work you had
in mind unless that promise represents it. Most async bugs live in that gap.

- **It waits for settlement, not for side effects.** If a function starts work
  and returns before that work finishes, awaiting it tells you nothing about the
  work.
- **An `async` function can return before its internal work completes.** Anything
  it kicked off without awaiting outlives the call.
- **It does not understand callbacks.** An `await` on a function whose result
  arrives in a callback resolves immediately. Promisify first.
- **It accepts any thenable**, not only a native promise - including one that
  never settles.
- **It waits for rejection too**, which is why the `try` must wrap the `await`
  and not the call that created the promise.
- **`await Promise.all(...)` waits for one combined promise**, so the first
  rejection wins and the rest keep running unobserved.
- **A stream is not done because the call returned.** Await the promise that
  represents completion (`finished`, `pipeline`), not the one that starts it.
- **Settled does not mean still relevant.** By the time it resolves, the user may
  have navigated away or typed something newer.

### Async mistakes that produce the strangest bugs: missing await, forEach, race conditions

```js
// Missing await: returns a pending promise, the try/catch never fires
const user = getUser(id);

// forEach ignores the promises it creates: the loop finishes before any work does
items.forEach(async (item) => {
  await save(item);
});
for (const item of items) {
  await save(item);
} // sequential, and correct
await Promise.all(items.map((item) => save(item))); // parallel, if the count is bounded

// Accidentally sequential: two independent calls, awaited one after the other
const a = await loadA();
const b = await loadB();
const [a, b] = await Promise.all([loadA(), loadB()]); // when they are independent

// try/catch in the wrong place: the promise was created inside, rejection escapes
try {
  doWork();
} catch {
  /* never runs */
}
try {
  await doWork();
} catch {
  /* runs */
}

// Stale read: the response that arrives last wins, not the one requested last
```

Not returning a promise inside a function hides it from the caller's `await` and
from its error handling. Mixing callbacks, promises and `async/await` in one flow
is where race conditions come from.

### Promise patterns: allSettled, any, race, timeout, retry, dedupe, cancel

```js
// Partial failure is acceptable: allSettled never rejects
const results = await Promise.allSettled(tasks);
const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);

// First success wins, e.g. mirrors. `any` rejects only if all reject
const fastest = await Promise.any([fromCache(), fromOrigin()]);

// Timeout: race the work against a rejection
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

// Retry with backoff. Retry only what is safe to repeat: idempotent reads,
// 429 and 5xx. Never a POST that charges a card without an idempotency key.
async function retry(fn, attempts = 3, delay = 200) {
  for (let index = 0; ; index++) {
    try {
      return await fn();
    } catch (error) {
      if (index >= attempts - 1 || !isRetryable(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** index));
    }
  }
}

// Deduplicate concurrent identical work: one request, many callers
const inFlight = new Map();
function once(key, fn) {
  if (!inFlight.has(key)) {
    inFlight.set(
      key,
      fn().finally(() => inFlight.delete(key)),
    );
  }
  return inFlight.get(key);
}

// Cancel work nobody is waiting for any more
const controller = new AbortController();
fetch(url, { signal: controller.signal });
controller.abort();
```

Bounded concurrency belongs here too, and it is a backend concern as much as a
frontend one: see
[rule-backend-node](../rule-backend-node/SKILL.md) for why an unbounded
`Promise.all` over request-sized input is a resource attack.

### Stale responses and ownership: who may write the state when a response lands

`await` made concurrency readable, not simple. The bug class that survives
review lives here, and it is not a caching bug: every response is valid relative
to its own request, and the wrong one still wins.

Type `j`, then `jav`. Both requests are in flight. The response for `jav` arrives
first and renders. The response for `j` arrives second and overwrites it with
results that were correct when they were asked for. **Completion is not
relevance, and the code treated finishing as permission to write.**

The same shape, wearing other clothes:

- A record loads, the user opens a second one, the first response arrives last.
- A dashboard filter changes while the earlier query is still running.
- Validation for a field value that the user has already corrected.
- A background refresh overwriting a local edit.
- Two saves competing for the same row.

**The fix is not "cancel the previous request". The fix is to decide ownership**,
and cancellation is only one way to express the decision:

| Rule                            | When                                                                     |
| ------------------------------- | ------------------------------------------------------------------------ |
| Newest wins                     | Search, filters, anything where the user's latest intent is the truth    |
| Serialize                       | Operations that must not interleave, such as ordered writes              |
| Independent state per operation | Several uploads, each with its own progress                              |
| The database decides            | Several servers or users compete, so the guard belongs where the data is |

Give the operation an identity and check it before writing. Not the input value,
which repeats and can be requested twice, but the operation:

```js
let latestRequest = 0;

async function search(query) {
  const request = ++latestRequest;
  setLoading(true);
  try {
    const response = await fetch(`/api/users?query=${encodeURIComponent(query)}`);
    const users = await response.json();
    if (request !== latestRequest) {
      return;
    }

    setResults(users);
  } catch (error) {
    if (request === latestRequest) {
      setError(error);
    }
  } finally {
    if (request === latestRequest) {
      setLoading(false);
    }
  }
}
```

Note that loading and error are guarded too. **Whatever owns the data owns its
loading and error state**, or a stale rejection clears a spinner that belongs to
a newer request.

### Reviewing async code: read the timeline, not the function

A review follows files and functions, and a race lives in a timeline. Read once
from top to bottom, the handler above is obviously correct: the query goes in,
the request uses it, the result renders. Seeing the bug requires simulating two
overlapping runs of the same function, and nothing in the source hints that
another copy may be in flight. Async syntax is designed to read sequentially,
which is exactly what hides this.

Four questions that put time back into the review:

1. What happens if this starts again before it finishes?
2. Does completion still imply relevance when the response arrives?
3. Do the loading and error states have the same owner as the data?
4. Does the test control the order in which the promises settle?

The last one matters because **tests pass when time is too cooperative**. A test
whose mocks resolve in call order proves the happy path and nothing about the
bug. Resolve them out of order on purpose, newest first, and assert that the
older response changes nothing.

### Streaming instead of collecting

For a paginated source, an async generator gives the caller pages as they arrive
instead of after the last one, and it stops when the caller stops:

```js
async function* pages(url) {
  let next = url;
  while (next) {
    const response = await fetch(next);
    const { data, nextPage } = await response.json();
    yield data;
    next = nextPage;
  }
}

for await (const page of pages("/api/posts")) {
  render(page);
}
```

Collecting the whole thing into an array is `await Array.fromAsync(pages(url))`,
which is the right call only when the caller genuinely needs all of it at once.

## Built-ins that replaced a lodash import

Check availability in the runtimes you actually target before reaching for one
of these. They arrived across recent language editions rather than all at once,
and the point is to look before installing a package, not to assume.

| Instead of                                          | Use                             | Because                                                                     |
| --------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| A utility sum over floats                           | `Math.sumPrecise(iterable)`     | Accumulating in a loop compounds binary floating point error; this does not |
| `if (!map.has(k)) map.set(k, d); return map.get(k)` | `map.getOrInsert(k, d)`         | One lookup instead of three, and no branch to get wrong                     |
| A loop that pushes from an async iterable           | `await Array.fromAsync(source)` | Consumes an async iterable directly, with an optional mapping function      |
| `_.chain()` and friends                             | Iterator helpers                | Real laziness in the language, described below                              |

Iterator helpers are the one worth reading twice, because the array version is
not merely more verbose, it does more work:

```js
// Maps all 10,000, filters all 10,000, then throws away all but five.
const first = big
  .map(expensive)
  .filter((x) => x > 100)
  .slice(0, 5);

// Runs `expensive` only until five items have passed the filter.
const first = big
  .values()
  .map(expensive)
  .filter((x) => x > 100)
  .take(5)
  .toArray();
```

Each array method builds a whole new array before the next one starts. The
iterator pipeline pulls one value through every stage and stops the moment the
caller has enough.

### Proposals worth knowing, not yet worth depending on

- **Decorators**, standardized rather than compiler-flagged, with the decorated
  value and a context object passed in and a replacement returned. Relevant if a
  framework in the stack already leans on them.
- **Temporal**, an immutable date and time API with real time-zone handling,
  which is the long-awaited answer to the parts of `Date` nobody defends.
- **Signals**, a reactive primitive in the language rather than one per
  framework. Early, and the direction of travel is the interesting part.

The rule for all three: know them, do not build on them until the runtimes you
ship to have them, and never add a polyfill to a project for a feature nothing
in it needs yet.

## Loops and iteration

- Prefer `for...of` over `.forEach()` - always. `for...of` gives better TypeScript narrowing, lets you `await` directly, and supports `break`/`continue` (none of which work cleanly inside a `.forEach()` callback).
- Use `for...of` for iterating values. Avoid `for...in`.
- Avoid nesting or chaining loops when possible.
- For membership checks inside a loop, prefer `Set.prototype.has()` over `Array.prototype.includes()`: `.includes()` rescans the whole array per call (O(n²) in a loop), while `Set.has()` is roughly constant-time.

## Strings

- Prefer template strings.

```js
const greeting = `Hello, ${name}!`;
```

## Readability, style, and tooling

- Use 2-space indentation.
- Use trailing commas where allowed.
- Add semicolons. Always.
- Readable > performance unless you truly need performance.
- Avoid weird unreadable hacks.

## Truthy, falsy, and conditionals

- Be specific in checks. Don't rely on truthy/falsy for edge cases.
- Prefer ternary over logical `||` and `&&` for value selection.
- Prefer a ternary over a simple `if/else` that only returns or assigns a value - it avoids `let` and lets `prefer-const` flag the variable.

```js
// PREFERRED
function status(ok) {
  return ok ? "pass" : "fail";
}

// AVOID
function status(ok) {
  if (ok) {
    return "pass";
  } else {
    return "fail";
  }
}
```

## Modern JS/TS idioms (enforced by eslint-plugin-unicorn)

These are the correctness and performance idioms rule expects in every JS/TS file. They map to `eslint-plugin-unicorn` rules (see [rule-toolchain-eslint](../rule-toolchain-eslint/SKILL.md)); most are autofixable with `pnpm eslint . --fix`. The `for...of` idiom is enforced by rule's own `js-no-array-for-each` guardrail (the upstream unicorn rule was removed in unicorn 70).

| Idiom                   | ❌ Avoid                                           | ✅ Prefer                                  | Why                                                                                                                          |
| ----------------------- | -------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Set membership in loops | `allowed.includes(scope)` inside `.filter()`/loops | `new Set([...])` + `allowed.has(scope)`    | `.includes()` is O(n) per call -> O(n²) in loops; `Set.has()` is O(1)                                                        |
| Iteration               | `users.forEach(u => sendEmail(u))`                 | `for (const u of users) { sendEmail(u); }` | `break`/`continue`/`await` + better TS narrowing                                                                             |
| Node builtins           | `import fs from 'fs'`                              | `import fs from 'node:fs'`                 | Unambiguous; can't be shadowed by an npm package                                                                             |
| Throwing errors         | `throw Error('boom')`                              | `throw new Error('boom')`                  | Consistency; `new` required for error constructors                                                                           |
| Global string replace   | `str.replace(/-/g, ' ')`                           | `str.replaceAll('-', ' ')`                 | Clearer intent, no regex escaping                                                                                            |
| Nested array flatten    | `rows.map(r => r.cells).flat()`                    | `rows.flatMap(r => r.cells)`               | No intermediate array allocation                                                                                             |
| Builtin constructors    | `const cache = Map()`                              | `const cache = new Map()`                  | `new` required for `Map`/`Set`/`Date`/`Array`/`WeakMap`/`WeakSet` (`String`/`Number`/`Boolean`/`Symbol`/`BigInt` are exempt) |
| Regex                   | `/[0-9]/`                                          | `/\d/`                                     | Shorter, consistent                                                                                                          |

> Tuning: `prevent-abbreviations`, `no-null`, `no-array-reduce`, and `filename-case` are opinionated - scope them per project (`warn` or `ignore` options) instead of fighting the codebase.

## Types and safety

- Use TypeScript when possible.
- Never trust data you don't create. Validate user or API input before operating.

## DOM and Custom Elements

- Attach listeners in `connectedCallback()` and clean up in `disconnectedCallback()`.
- Keep rendering logic in `render()` and make it idempotent.

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

- Use static initialization blocks for stylesheet registration and custom element definition.

```js
class MyComponent extends HTMLElement {
  static hasRegisteredStyle = false;

  static {
    if (!MyComponent.hasRegisteredStyle) {
      registerStylesheet(styles);
      MyComponent.hasRegisteredStyle = true;
    }

    !customElements.get("my-component") && customElements.define("my-component", MyComponent);
  }
}
```

## Global access

- Prefer `globalThis` for global access.

## Regex

- Use regex for string manipulation instead of index-based manipulation.

## IIFE and utilities

- IIFE is useful for early setup before the rest of the code runs.
- Turn repeated logic into small generic utility functions.

## Testing - Playwright + axe-core (MANDATORY)

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
pnpx playwright install chromium
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

**`tests/a11y/_basic.spec.js`** - page-level structure:

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
    const levels = await page.evaluate(() => Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => parseInt(h.tagName[1], 10)));
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

**`tests/a11y/_forms.spec.js`** - form a11y:

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

**`tests/a11y/_components.spec.js`** - component-level (shadow DOM):

```js
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("A11y: components", () => {
  test("todo-item has no a11y violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).include("todo-item").analyze();
    expect(results.violations).toEqual([]);
  });
});
```

### Running Tests

```bash
# Run all tests
pnpx playwright test

# Run only a11y tests
pnpx playwright test tests/a11y/

# Single test file
pnpx playwright test tests/a11y/_basic.spec.js

# With UI mode (debugging)
pnpx playwright test --ui
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
      - run: pnpx playwright install chromium
      - run: pnpx playwright test
```

### axe-core Tags Reference

Filter axe rules by WCAG level:

```js
new AxeBuilder({ page }).withTags(["wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
```

| Tag             | WCAG Level                 |
| --------------- | -------------------------- |
| `wcag2aa`       | WCAG 2.0 Level AA          |
| `wcag21aa`      | WCAG 2.1 Level AA          |
| `wcag22aa`      | WCAG 2.2 Level AA (latest) |
| `best-practice` | Common a11y best practices |
| `section508`    | US Section 508             |

### Grounds for Failure (CI MUST Reject)

- ❌ Missing `tests/a11y/` directory
- ❌ Missing `playwright.config.js`
- ❌ No axe-core scan (no `@axe-core/playwright` import)
- ❌ Tests pass despite violations (`expect(results.violations).toEqual([])` must fail on a11y issues)
- ❌ Tests skipped with `.skip` or `.only` without documented reason
- ❌ A11y testing replaced with manual-only review
- ❌ Missing CI workflow file that runs a11y tests

### Enforcement

- The `rule_tool_check` tool validates: `tests/a11y/` exists, axe-core import present, `playwright.config.js` exists.
- Run `rule_tool_<skill> mode=check` on your project to verify testing compliance.
- See [`a11y.md`][rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md) -> Section 12 for full a11y testing guide.

## Project scaffolding reminders

- Keep the zero-runtime-dependencies promise. Use native browser APIs.
- Keep each custom element self-contained: render in `render()`, set up listeners in `connectedCallback()`, clean up in `disconnectedCallback()`.
- Export pure logic from separate modules and wire it from components.
- **Documentation is NOT optional.** Every JS/TS file needs JSDoc. Every CSS file needs clear comments.
- **Testing is NOT optional.** Every project needs Playwright + axe-core a11y tests.

---

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) - Style guides index
- [rule](../rule/SKILL.md) - Central skill index
