import { test, expect } from "@playwright/test";

test("add adds exactly 1 group per click", async ({ page }) => {
  await page.goto("http://localhost:19000");
  await page.waitForSelector("[data-part='stepper-root']");

  // Pick project type, then navigate to Step 5 (Glossary) which has repeatable groups
  await page.click("[data-part='project-type-card']:first-child");
  await page.waitForTimeout(200);

  // Navigate: step 2 → 3 → 4 → 5
  for (let i = 0; i < 4; i++) {
    await page.click("[data-part='nav-btn'][data-direction='next']");
    await page.waitForTimeout(300);
  }

  // Step 5: DOMAIN_TERMS repeatable group
  const groups = page.locator("[data-part='repeatable-group']");
  const before = await groups.count();
  console.log(`Initial groups: ${before}`);

  // Click "+ Add Domain Terms" button (first add button on this step)
  const addBtn = page.locator("[data-part='add-btn']").first();
  await expect(addBtn).toBeVisible();
  await addBtn.click();
  await page.waitForTimeout(500);

  const after = await groups.count();
  console.log(`After 1 click: ${before} → ${after}`);

  // Must add exactly 1
  expect(after - before).toBe(1);

  // Click again
  await addBtn.click();
  await page.waitForTimeout(500);
  const after2 = await groups.count();
  console.log(`After 2 clicks: ${after} → ${after2}`);
  expect(after2 - after).toBe(1);

  // Remove one
  const removeBtn = page.locator("[data-part='remove-btn']").first();
  if (await removeBtn.isVisible().catch(() => false)) {
    await removeBtn.click();
    await page.waitForTimeout(500);
    const afterRemove = await groups.count();
    console.log(`After remove: ${after2} → ${afterRemove}`);
    expect(afterRemove).toBe(after2 - 1);
  }
});
