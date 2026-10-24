/**
 * Runtime health of the emitted docs site: a clean console, and controls large
 * enough to hit.
 */

import { expect, test } from "@playwright/test";

import { installSite, NAV_PAGES } from "./_site.mjs";

const site = installSite(test);

test("no console errors on any page; controls meet the 24px target floor", async ({ browser }) => {
  const context = await browser.newContext();
  const problems = [];

  for (const out of ["index.html", ...NAV_PAGES]) {
    const page = await context.newPage();
    const errors = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(site.url(out));

    if (errors.length > 0) {
      problems.push(`${out}: ${errors.join(" | ")}`);
    }

    const targets = await page.evaluate(() => {
      const small = [];

      for (const element of document.querySelectorAll("header summary, header nav a, main p[data-part='cta'] a")) {
        const box = element.getBoundingClientRect();

        if (box.height > 0 && box.height < 24) {
          small.push(`${element.tagName} ${element.textContent.trim().slice(0, 24)}: ${Math.round(box.height)}px`);
        }
      }

      return small;
    });

    for (const target of targets) {
      problems.push(`${out}: small target ${target}`);
    }
    await page.close();
  }

  expect(problems, "console errors and small targets").toEqual([]);
  await context.close();
});
