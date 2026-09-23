import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("phonebook has no detectable accessibility violations", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000");
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
