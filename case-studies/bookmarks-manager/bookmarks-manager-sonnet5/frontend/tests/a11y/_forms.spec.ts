/**
 * @module tests/a11y/_forms.spec
 *
 * Tests the bookmark composer form: label association, invalid submission
 * feedback, and a zero-violation axe scan after interaction.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("A11y: bookmark composer form", () => {
  test("the URL field has an associated label", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("label[for='bookmark-url']")).toBeAttached();
    await expect(page.locator("#bookmark-url")).toBeAttached();
  });

  test("submitting an invalid value announces a validation error", async ({ page }) => {
    await page.goto("/");
    await page.locator("#bookmark-url").fill("not a url");
    await page.getByRole("button", { name: /save link/i }).click();
    await expect(page.getByRole("alert")).toContainText(/enter a full link/i);
  });

  test("no axe violations after a failed submission", async ({ page }) => {
    await page.goto("/");
    await page.locator("#bookmark-url").fill("not a url");
    await page.getByRole("button", { name: /save link/i }).click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
