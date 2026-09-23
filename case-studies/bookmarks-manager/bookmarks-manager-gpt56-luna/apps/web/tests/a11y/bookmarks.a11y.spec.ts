import AxeBuilder from "@axe-core/playwright";
/** WCAG 2.2 AA smoke test for the primary Luma experience. */
import { expect, test } from "@playwright/test";

test("bookmark capture page has no detectable WCAG violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /save what matters/i }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
