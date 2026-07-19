# Reference

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
    const results = await new AxeBuilder({ page }).analy
