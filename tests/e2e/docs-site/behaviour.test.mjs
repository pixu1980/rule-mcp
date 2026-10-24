/**
 * Behavior of the emitted docs site: the keyboard path, reflow at 320px, the
 * motion budget, console cleanliness and target size.
 */

import { expect, test } from "@playwright/test";

import { allPages, installSite, NAV_PAGES } from "./_site.mjs";

const site = installSite(test);

test("keyboard path: skip link first, visible focus, dropdown operable", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(site.url("index.html"));

  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement?.getAttribute("href"));

  expect(first, "skip link is the first stop").toBe("#main");

  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth);

  expect(ring, "focus ring is visible").not.toBe("0px");

  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();

  // The preferences dropdown opens from the keyboard and applies the theme.
  await page.locator("header details[data-part='prefs'] summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("header details[data-part='prefs']")).toHaveAttribute("open", "");

  await page.getByText("Dark", { exact: true }).click();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");

  await page.reload();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");

  await page.keyboard.press("Escape");
  await expect(page.locator("header details[data-part='prefs']")).not.toHaveAttribute("open", "");
  await context.close();
});

test("content reflows at 320 CSS px without horizontal scrolling (WCAG 1.4.10)", async ({ browser }) => {
  const outs = allPages();
  const failures = [];

  for (const width of [320, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });

    for (const out of outs) {
      const page = await context.newPage();
      await page.goto(site.url(out));

      const reflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollers: document.querySelectorAll('[data-part="table-scroll"]').length,
        tables: document.querySelectorAll("table").length,
      }));

      if (reflow.scrollWidth > reflow.clientWidth) {
        failures.push(`${width}px ${out}: page scrolls horizontally (${reflow.scrollWidth} > ${reflow.clientWidth})`);
      }

      // Every table sits in a scroll container, so a wide one scrolls itself
      // instead of stretching the document.
      if (reflow.tables > reflow.scrollers) {
        failures.push(`${width}px ${out}: ${reflow.tables - reflow.scrollers} table(s) outside a scroll container`);
      }
      await page.close();
    }
    await context.close();
  }

  expect(failures, "reflow at 320px").toEqual([]);
});

test("no motion on the page except the view transition", async ({ browser }) => {
  const context = await browser.newContext();
  const offenders = [];

  for (const out of ["index.html", ...NAV_PAGES]) {
    const page = await context.newPage();
    await page.goto(site.url(out));

    const animated = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .map((element) => {
          const style = getComputedStyle(element);
          const moving = style.transitionDuration
            .split(",")
            .map((part) => Number.parseFloat(part))
            .some((seconds) => seconds > 0);

          return style.animationName === "none" && !moving ? null : `${element.tagName.toLowerCase()}: animation=${style.animationName} transition=${style.transitionDuration}`;
        })
        .filter(Boolean),
    );

    for (const item of animated) {
      offenders.push(`${out}: ${item}`);
    }
    await page.close();
  }

  expect(offenders, "only the view transition may animate").toEqual([]);
  await context.close();
});
