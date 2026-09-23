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
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("headings don't skip levels", async ({ page }) => {
    await page.goto("/");
    const levels = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => Number(h.tagName[1])),
    );
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  test("page has <main> landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toBeAttached();
  });

  test("html has a lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});
