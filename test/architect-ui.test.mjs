// playwright a11y test for context-server interview UI
// Tests: add/remove repeatable groups, no infinite loops, no crashes
import { test, expect } from "@playwright/test";

test.describe("pix-architect interview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:19000");
    await page.waitForSelector("[data-part='wizard-body']", { timeout: 10000 });
  });

  test("loads 13 steps including step 0", async ({ page }) => {
    const dots = page.locator("[data-part='step-dot']");
    await expect(dots).toHaveCount(13); // step 0 + 12 standard-tier sections
    await expect(page.locator("[data-part='tier-btn']")).toHaveCount(3);
  });

  test("step 0 lets you choose tier depth", async ({ page }) => {
    const tiers = page.locator("[data-part='tier-btn']");
    await tiers.nth(2).click(); // deep
    await expect(page.locator("[data-part='step-dot']")).toHaveCount(16); // step 0 + 15 all sections
    await tiers.first().click(); // starter
    await expect(page.locator("[data-part='step-dot']")).toHaveCount(3); // step 0 + 2 starter sections
  });

  test("project type & stack merged; tech cards filtered on same step", async ({ page }) => {
    // Step 0 -> Step 1 (merged)
    await page.click("[data-part='nav-btn'][data-direction='next']");
    // Step 1: type cards + stack fields are on the SAME step
    // Click Web Application
    await page.click("[data-part='project-type-card']:first-child");
    // Wait for selection + re-render (stack fields filter by PROJECT_TYPE)
    await expect(page.locator("[data-part='project-type-card']:first-child"))
      .toHaveAttribute("data-state-selected", "true");
    // Tech cards should be filtered for webapp on the same page
    await expect(page.locator("[data-part='tech-card']").filter({ hasText: "SQLite" }).first()).toBeVisible();
    await expect(page.locator("[data-part='tech-card']").filter({ hasText: "tRPC" }).first()).toBeVisible();
    await expect(page.locator("[data-part='tech-card']").filter({ hasText: "Vanilla CSS" }).first()).toBeVisible();
    await expect(page.locator("[data-part='tech-card']").filter({ hasText: "PostgreSQL" })).toHaveCount(0);
  });

  test("add/remove repeatable group — no infinite loop", async ({ page }) => {
    // Navigate to Step 4 (Glossary) — has repeatable groups
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 1 (merged)
    await page.click("[data-part='project-type-card']:first-child");
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 2
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 3
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 4

    // Step 4 (Glossary) should be here — look for add button
    const addBtn = page.locator("[data-part='add-btn']");
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click add multiple times
      const initialCount = await page.locator("[data-part='repeatable-group']").count();
      await addBtn.click();
      await page.waitForTimeout(500);
      // Should have one more group
      const afterFirst = await page.locator("[data-part='repeatable-group']").count();
      expect(afterFirst).toBeGreaterThan(initialCount);

      // Click add again
      await addBtn.click();
      await page.waitForTimeout(500);
      const afterSecond = await page.locator("[data-part='repeatable-group']").count();
      expect(afterSecond).toBeGreaterThan(afterFirst);

      // Click remove on first group
      const removeBtn = page.locator("[data-part='remove-btn']").first();
      if (await removeBtn.isVisible().catch(() => false)) {
        await removeBtn.click();
        await page.waitForTimeout(500);
        // Should have fewer groups
        const afterRemove = await page.locator("[data-part='repeatable-group']").count();
        expect(afterRemove).toBeLessThan(afterSecond);
      }
    }
  });

  test("generate creates files — no crash", async ({ page }) => {
    // Quick fill and generate
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 1 (merged)
    await page.click("[data-part='project-type-card']:first-child");

    // Navigate to last step
    for (let i = 0; i < 20; i++) {
      const nextBtn = page.locator("[data-part='nav-btn'][data-direction='next']");
      if (!(await nextBtn.isVisible().catch(() => false))) break;
      await nextBtn.click();
      await page.waitForTimeout(300);
    }

    // Should see submit buttons
    const generateBtn = page.locator("[data-part='submit-btn']");
    const downloadBtn = page.locator("[data-part='download-btn']");
    await expect(generateBtn).toBeVisible({ timeout: 5000 });
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });

    // Click download (doesn't write to disk)
    await downloadBtn.click();
    await page.waitForTimeout(2000);
    // Should show done screen
    await expect(page.locator("[data-part='result']")).toBeVisible({ timeout: 5000 });
  });

  test("Other project type shows architecture skills", async ({ page }) => {
    await page.click("[data-part='nav-btn'][data-direction='next']"); // step 1 (merged)
    const cards = page.locator("[data-part='project-type-card']");
    const count = await cards.count();
    await cards.nth(count - 1).click();
    // Architecture skills select should appear
    const archSelect = page.locator("select[name='PROJECT_TYPE_OTHER']");
    await expect(archSelect).toBeVisible({ timeout: 3000 });
  });
});
