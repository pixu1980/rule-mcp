import { test, expect } from "@playwright/test";

test("capture console errors on add click", async ({ page }) => {
  const errors = [];
  page.on("console", message => {
    if (message.type() === "error") {errors.push(message.text());}
  });
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("http://localhost:19000");
  await page.waitForSelector("[data-part='stepper-root']");

  // Navigate to step 5
  await page.click("[data-part='project-type-card']:first-child");
  await page.waitForTimeout(200);
  for (let index = 0; index < 4; index++) {
    await page.click("[data-part='nav-btn'][data-direction='next']");
    await page.waitForTimeout(300);
  }

  const addButton = page.locator("[data-part='add-btn']").first();
  await expect(addButton).toBeVisible();

  // Check the button's data-prefix
  const prefix = await addButton.getAttribute("data-prefix");
  console.log("Add button prefix:", prefix);
  console.log("Add button HTML:", await addButton.evaluate(element => element.outerHTML));

  // Click add
  await addButton.click();
  await page.waitForTimeout(1000);

  if (errors.length > 0) {
    console.log("Console errors:", errors.join("\n"));
  } else {
    console.log("No console errors ✅");
  }

  const groups = await page.locator("[data-part='repeatable-group']").count();
  console.log("Groups after click:", groups);
});
