

/**
 * Text contrast of the emitted docs site, in both themes.
 *
 * Every group is measured where it actually renders: home carries the hero,
 * the stats, and the calls to action; the guide carries prose and tables; the
 * surface map carries the densest table on the site.
 */

import { expect, test } from "@playwright/test";

import { ratioOf } from "./_contrast.mjs";
import { darkContext, installSite } from "./_site.mjs";

const site = installSite(test);

const MINIMUM = 4.5;

const COVERAGE = [
  [
    "index.html",
    [
      "main p",
      "main a",
      "footer p",
      "code",
      "header nav a",
      "header nav a[aria-current='page']",
      "header details[data-part='prefs'] summary",
      "body[data-page='home'] ul[data-part='stats'] strong",
      "body[data-page='home'] p[data-part='cta'] a",
    ],
  ],
  ["docs/getting-started.html", ["main p", "main a", "footer p", "td", "code", "th", "header nav a", "header details[data-part='prefs'] summary"]],
  [
    "docs/surface-map.html",
    ["main p", "main a", "footer p", "code", "th", "header nav a", "header details[data-part='prefs'] summary", "nav[aria-label='Reference'] a[aria-current='page']"],
  ],
];

test("text contrast meets 4.5:1 per element group, light and dark", async ({ browser }) => {
  const failures = [];

  for (const { name, context } of [
    { name: "light", context: await browser.newContext() },
    { name: "dark", context: await darkContext(browser) },
  ]) {
    for (const [out, selectors] of COVERAGE) {
      const page = await context.newPage();
      await page.goto(site.url(out));

      for (const selector of selectors) {
        const ratio = await page.evaluate(ratioOf, selector);

        if (ratio === null) {
          failures.push(`${name} ${out}: ${selector} not found`);
          continue;
        }

        if (ratio < MINIMUM) {
          failures.push(`${name} ${out} ${selector}: ${ratio.toFixed(2)}:1 below ${MINIMUM}:1`);
        }
      }
      await page.close();
    }
    await context.close();
  }

  expect(failures, "low-contrast groups").toEqual([]);
});
