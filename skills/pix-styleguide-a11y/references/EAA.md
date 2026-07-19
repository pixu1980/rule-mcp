## 6. Images and Media

* Every `<img>` must have meaningful `alt` text. Decorative images must have `alt=""` (empty).
* Complex images (charts, diagrams) must have a detailed `alt` description plus a text equivalent nearby.

```html
<!-- Informative image -->
<img src="chart.png" alt="Bar chart showing 2026 revenue: Q1 $1.2M, Q2 $1.8M, Q3 $2.1M" />

<!-- Decorative image -->
<img src="decoration.png" alt="" role="presentation" />
```

* Audio and video must have captions (prerecorded) and/or transcripts.
* Auto-playing media is forbidden unless the user explicitly consents.

---

## 7. ARIA (Accessible Rich Internet Applications)

* **First rule of ARIA**: do not use ARIA if native HTML semantics work.
* Use ARIA only to augment, never to override.

| Scenario | Native solution | ARIA only when |
|----------|----------------|----------------|
| Button | `<button>` | Icon-only button needs `aria-label` |
| Navigation | `<nav>` | Dynamic tree navigation needs `role="tree"` |
| Dialog | `<dialog>` with native API | Custom dialog needs `role="dialog" aria-modal="true"` |
| Progress | `<progress>` | Custom progress indicator needs `role="progressbar"` |
| Status | Native live regions (`aria-live`) | Dynamic content updates in a custom widget |

```html
<!-- ✅ CORRECT: native button -->
<button aria-label="Close dialog" onclick="close()">✕</button>

<!-- ❌ VIOLATION: ARIA on a div instead of native element -->
<div role="button" tabindex="0" onclick="close()">✕</div>
```

---

## 8. Dynamic Content and Live Regions

* Use `aria-live` regions for content that updates dynamically:

| `aria-live` value | Use when |
|-------------------|----------|
| `"polite"` | Updates happen but are not urgent (feed, notifications) |
| `"assertive"` | Updates are critical and must be announced immediately (error, timeout warning) |

```html
<div aria-live="polite" aria-atomic="true">
  <!-- Dynamic content updates here -->
</div>
```

* Toast notifications and error banners must use `role="alert"` or `aria-live="assertive"`.

---

## 9. Touch and Motion

* All touch targets must be at least **24×24 CSS pixels** (AA), with **44×44** recommended.
* Ensure sufficient spacing between touch targets to prevent accidental activation.
* Do not rely on hover alone for critical interactions — support touch and keyboard.

---

## 10. Motion and Animation

* Respect the user's `prefers-reduced-motion` setting.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

* No content may flash more than **3 times per second** (WCAG 2.2 — seizures).

---

## 11. Language and Reading

* The page must declare a `lang` attribute on `<html>`.
* Parts of the page in a different language must use `lang` on the container element.

```html
<html lang="en">
<body>
  <p>The party starts at <span lang="fr">20h00</span>.</p>
</body>
```

---

## 12. Automated Testing — Playwright + axe-core (MANDATORY)

> **Every project MUST have automated a11y tests using Playwright + @axe-core/playwright.**
> No exceptions. CI MUST fail on any a11y violation.

### Why

- Manual review catches ~30% of a11y issues. Automated tools catch the rest.
- axe-core is the industry standard (used by Google, Microsoft, Deque).
- Playwright provides cross-browser, cross-platform reliable testing.

### Setup

```bash
pnpm install --save-dev playwright @axe-core/playwright
pnpm playwright install chromium
```

### Required Test Structure

Every project MUST have an `__tests__/` or `tests/` directory with:

```
tests/
  a11y/
    _basic.spec.js        # Landmarks, headings, language, color contrast
    _forms.spec.js        # Form inputs, labels, error messages
    _navigation.spec.js   # Keyboard nav, focus management, skip links
    _components.spec.js   # Individual component-level a11y checks
  playwright.config.js    # Shared Playwright config
```

### Required Test Pattern

```js
/**
 * @module tests/a11y/_basic.spec
 *
 * Basic a11y tests using Playwright + axe-core.
 * Tests: page landmarks, headings, language, global violations.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("A11y: basic page structure", () => {
  test("page has no auto-detected a11y violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("page has exactly one <h1>", async ({ page }) => {
    await page.goto("/");
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBe(1);
  });

  test("headings don't skip levels", async ({ page }) => {
    await page.goto("/");
    const levels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
        .map(h => parseInt(h.tagName[1], 10));
    });
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
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});
```

### Forms A11y Test

```js
/**
 * Tests form-related a11y: labels, error associations, required fields.
 */
test.describe("A11y: forms", () => {
  test("form inputs have labels", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("label[for]").first()).toBeAttached();
  });

  test("no axe violations on form interaction", async ({ page }) => {
    await page.goto("/contact");
    await page.locator("input[name='email']").fill("bad");
    await page.locator("button[type='submit']").click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

### Component-level A11y Test

For component-level tests (especially with shadow DOM):

```js
/** Tests a11y of individual component in isolation. */
test.describe("A11y: TodoItem component", () => {
  test("todo item meets a11y standards", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .include("todo-item")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
```

### Run in CI

```yml
# .github/workflows/a11y.yml
name: A11y
on: [push, pull_request]
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install chromium
      - run: pnpm playwright test tests/a11y/
```

### axe-core Run Options

| Option | Purpose | Example |
|--------|---------|---------|
| `include` | Scope to a selector | `include("main")` |
| `exclude` | Skip a region | `exclude("iframe")` |
| `withRules` | Only these rules | `withRules(["color-contrast"])` |
| `withTags` | Filter by tag | `withTags(["wcag2aa", "wcag21aa"])` |
| `disableRules` | Exclude noisy rules | `disableRules(["region"])` |

### Grounds for Failure

- ❌ Missing `tests/a11y/` directory
- ❌ No axe-core scan of any page
- ❌ CI passes despite a11y violations (`expect(results.violations).toEqual([])` must fail CI)
- ❌ Skipping tests with `.skip` or `.only` without documented reason
- ❌ Using manual-only a11y review as replacement

### Enforcement

- The `pix_check` tool validates `tests/a11y/` presence and Playwright + axe-core usage.
- Run `pix_<skill> mode=check` on your test files to verify compliance.
- **CI MUST fail** if any a11y test fails or if no a11y tests exist.
- See [`rule-styleguide → testing`][rule-styleguide-javascript](../rule-styleguide-javascript/SKILL.md) for full Playwright testing standards.

---

## 13. Testing Checklist

Before every PR, verify:

- [ ] Page has one `<h1>`, headings don't skip levels
- [ ] All `<div>` elements have been reviewed — can any be replaced with `<section>`, `<article>`, `<nav>`, `<header>`, `<main>`, `<footer>`, `<aside>`, `<figure>`?
- [ ] Every `<input>` has an associated `<label>`
- [ ] All images have `alt` text (or `alt=""` for decorative)
- [ ] Focus styles are present and visible (never `outline: none` without replacement)
- [ ] Color contrast passes 4.5:1 for text, 3:1 for large text
- [ ] No information is conveyed by color alone
- [ ] Keyboard navigation works (Tab through all interactive elements)
- [ ] `:focus-visible` is styled for all interactive elements
- [ ] `prefers-reduced-motion` is respected
- [ ] Page has `<main>` landmark
- [ ] Language is declared on `<html>`
- [ ] ARIA is used only when native HTML semantics are insufficient
- [ ] Touch targets are ≥24×24px
- [ ] **Playwright + axe-core a11y tests exist in `tests/a11y/`**
- [ ] **axe-core scan passes with zero violations**
- [ ] **CI runs a11y tests and fails on violations**


---

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) — Style guides index
- [rule](../rule/SKILL.md) — Central skill index
