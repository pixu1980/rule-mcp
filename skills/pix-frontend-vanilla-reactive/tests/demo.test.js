// ═══════════════════════════════════════════════════════════════════════════════
//  rule-vanilla-reactive — Playwright test suite
//  Run:  cd ~/.agents/skills/rule-vanilla-reactive/tests
//  Server: cd examples && node ... serving src/
// ═══════════════════════════════════════════════════════════════════════════════

const { test, expect } = require("@playwright/test");

const BASE = "http://127.0.0.1:8767/index.html";

test.describe("rule-vanilla-reactive demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForSelector("app-root h1", { timeout: 15000 });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  SMOKE
  // ═══════════════════════════════════════════════════════════════════════════

  test("page loads without errors", async ({ page }) => {
    await expect(page.locator("app-root")).not.toBeEmpty();
    await expect(page.locator("h1")).toContainText("\uD83D\uDCCB Vanilla Reactive Todo");
  });

  test("no unprocessed directive elements", async ({ page }) => {
    expect(await page.locator("for").count()).toBe(0);
    expect(await page.locator("if").count()).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  {{ }} INTERPOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  test("{{ }} renders stats", async ({ page }) => {
    await expect(page.locator('[data-part="stats"]')).toContainText("Total:");
    await expect(page.locator('[data-part="stats"]')).toContainText("Open:");
    await expect(page.locator('[data-part="stats"]')).toContainText("Done:");
  });

  test("{{ pulseCount }} renders a number", async ({ page }) => {
    await expect(page.locator("body")).toContainText(/pulse count:\s*\d+/i);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  FILTERS
  // ═══════════════════════════════════════════════════════════════════════════

  test("| upper filter", async ({ page }) => {
    await expect(page.locator("body")).toContainText("VANILLA-REACTIVE-TODO");
  });

  test("| raw filter → unescaped HTML", async ({ page }) => {
    const count = await page.locator('app-root [data-part="demo-note"] strong').count();
    expect(count).toBeGreaterThan(0);
  });

  test("| raw filter renders <strong> in description", async ({ page }) => {
    await expect(page.locator('[data-part="demo-note"]')).toContainText("template engine");
  });

  test("| join filter", async ({ page }) => {
    await expect(page.locator("body")).toContainText("html, css, js, demo");
  });

  test("| default filter", async ({ page }) => {
    await expect(page.locator("body")).toContainText("Click any todo to toggle");
  });

  test("| truncate filter on tag", async ({ page }) => {
    const tags = page.locator('[data-part="todo-item"] [data-part="tag"]');
    for (let i = 0; i < (await tags.count()); i++) {
      expect((await tags.nth(i).textContent()).length).toBeLessThanOrEqual(13);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  <for> DIRECTIVE
  // ═══════════════════════════════════════════════════════════════════════════

  test("<for> renders 3 items", async ({ page }) => {
    await expect(page.locator('[data-part="todo-item"]')).toHaveCount(3);
  });

  test("<for> titles visible in input value", async ({ page }) => {
    const inputs = page.locator('[data-part="todo-item"] [data-part="todo-title"]');
    await expect(inputs).toHaveCount(3);
    await expect(inputs.first()).toHaveValue("Learn template engine syntax");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  <if> DIRECTIVE
  // ═══════════════════════════════════════════════════════════════════════════

  test("<if> badge only for completed item", async ({ page }) => {
    await expect(page.locator('[data-part="badge"]')).toHaveCount(1);
    await expect(page.locator('[data-part="badge"]')).toContainText("\u2713 DONE");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  STATS
  // ═══════════════════════════════════════════════════════════════════════════

  test("stats initial: 3 Total, 2 Open, 1 Done", async ({ page }) => {
    await expect(page.locator('[data-part="stats"] li').nth(0)).toContainText("3");
    await expect(page.locator('[data-part="stats"] li').nth(1)).toContainText("2");
    await expect(page.locator('[data-part="stats"] li').nth(2)).toContainText("1");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  @submit — form
  // ═══════════════════════════════════════════════════════════════════════════

  test("@submit adds todo", async ({ page }) => {
    await page.locator('input[name="title"]').fill("BrandNewItem");
    await page.locator('button:has-text("Add")').click();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-part="todo-item"]')).toHaveCount(4);
    const inputs = page.locator('[data-part="todo-item"] [data-part="todo-title"]');
    const values = [];
    for (let i = 0; i < (await inputs.count()); i++) values.push(await inputs.nth(i).inputValue());
    expect(values).toContain("BrandNewItem");
  });

  test("@submit clears input", async ({ page }) => {
    await page.locator('input[name="title"]').fill("Something");
    await page.locator('button:has-text("Add")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('input[name="title"]')).toHaveValue("");
  });

  test("@submit empty input ignored", async ({ page }) => {
    await page.locator('button:has-text("Add")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-part="todo-item"]')).toHaveCount(3);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  @click — filter buttons
  // ═══════════════════════════════════════════════════════════════════════════

  test("@click filter Done hides open", async ({ page }) => {
    await page.locator('button:has-text("Done")').click();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-part="badge"]')).toHaveCount(1);
    await expect(page.locator('[data-part="todo-item"]')).toHaveCount(1);
  });

  test("@click filter Open hides completed", async ({ page }) => {
    await page.locator('button:has-text("Open")').click();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-part="badge"]')).toHaveCount(0);
    await expect(page.locator('[data-part="todo-item"]')).toHaveCount(2);
  });

  test("@click filter All restores", async ({ page }) => {
    await page.locator('button:has-text("Done")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("All")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-part="todo-item"]')).toHaveCount(3);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  model= — two-way binding
  // ═══════════════════════════════════════════════════════════════════════════

  test("model checkbox toggle updates stats", async ({ page }) => {
    await expect(page.locator('[data-part="stats"] li').nth(1)).toContainText("2");
    await expect(page.locator('[data-part="stats"] li').nth(2)).toContainText("1");

    const cb = page.locator('[data-part="todo-item"] input[type="checkbox"]').first();
    await cb.check();
    await page.waitForTimeout(500);

    await expect(page.locator('[data-part="stats"] li').nth(1)).toContainText("1");
    await expect(page.locator('[data-part="stats"] li').nth(2)).toContainText("2");
  });

  test("model input edits todo title", async ({ page }) => {
    const input = page.locator('[data-part="todo-item"] [data-part="todo-title"]').first();
    await input.fill("EditedTitle");
    await page.waitForTimeout(400);
    await expect(input).toHaveValue("EditedTitle");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  @click — delete button
  // ═══════════════════════════════════════════════════════════════════════════

  test("delete button removes item", async ({ page }) => {
    await page.locator('[data-part="todo-item"] button:has-text("\u2715")').first().click();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-part="todo-item"]')).toHaveCount(2);
    await expect(page.locator('[data-part="stats"] li').nth(0)).toContainText("2");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  REACTIVITY
  // ═══════════════════════════════════════════════════════════════════════════

  test("stats update after add", async ({ page }) => {
    await page.locator('input[name="title"]').fill("New one");
    await page.locator('button:has-text("Add")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-part="stats"] li').nth(0)).toContainText("4");
  });

  test("filter status label reactive", async ({ page }) => {
    await page.locator('button:has-text("Open")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('nav[aria-label="Filter todos"] strong')).toContainText("open");
    await page.locator('button:has-text("Done")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('nav[aria-label="Filter todos"] strong')).toContainText("done");
  });

  test("multiple adds updates lists", async ({ page }) => {
    const input = page.locator('input[name="title"]');
    const add = page.locator('button:has-text("Add")');
    await input.fill("A");
    await add.click();
    await page.waitForTimeout(100);
    await input.fill("B");
    await add.click();
    await page.waitForTimeout(100);
    await input.fill("C");
    await add.click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-part="todo-item"]')).toHaveCount(6);
    await expect(page.locator('[data-part="stats"] li').nth(0)).toContainText("6");
  });

  test("filter persists across add", async ({ page }) => {
    await page.locator('button:has-text("Open")').click();
    await page.waitForTimeout(200);
    await page.locator('input[name="title"]').fill("New open");
    await page.locator('button:has-text("Add")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('nav[aria-label="Filter todos"] strong')).toContainText("open");
    await expect(page.locator('[data-part="badge"]')).toHaveCount(0);
  });
});
