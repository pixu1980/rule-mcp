/**
 * Accessibility of the emitted docs site, measured in Chromium.
 *
 * axe-core covers the machine-decidable half of WCAG 2.2 AA; the boilerplate
 * test covers the document contract a scan cannot see (one h1, one main, a
 * unique title, a skip link). What neither covers needs a person.
 */

import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

import { allPages, darkContext, installSite, REFERENCE_NAV } from "./_site.mjs";

const site = installSite(test);

test("axe-core passes WCAG 2.2 AA on every emitted page, light and dark", async ({ browser }) => {
  test.setTimeout(240_000);
  const failures = [];

  for (const { name, context } of [
    { name: "light", context: await browser.newContext() },
    { name: "dark", context: await darkContext(browser) },
  ]) {
    for (const out of allPages()) {
      const page = await context.newPage();
      await page.goto(site.url(out));
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      await page.close();

      for (const violation of results.violations) {
        failures.push(`${name} ${out}: ${violation.id} (${violation.impact}) on ${violation.nodes.length} node(s)`);
      }
    }
    await context.close();
  }

  expect(failures, "axe-core violations").toEqual([]);
});

test("document boilerplate: lang, unique titles, one h1, landmarks", async ({ browser }) => {
  const context = await browser.newContext();
  const titles = new Set();
  const outs = allPages();

  for (const out of outs) {
    const page = await context.newPage();
    await page.goto(site.url(out));

    const meta = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      h1: document.querySelectorAll("main h1").length,
      main: document.querySelectorAll("main").length,
      header: document.querySelectorAll("body > header").length,
      footer: document.querySelectorAll("body > footer").length,
      nav: document.querySelectorAll("nav").length,
      skip: document.querySelector("body > a[href='#main']") !== null,
    }));

    expect(meta.lang, `${out}: html lang`).toBe("en");
    expect(meta.h1, `${out}: a single h1`).toBe(1);
    expect(meta.main, `${out}: a single main`).toBe(1);
    expect(meta.header, `${out}: header landmark`).toBe(1);
    expect(meta.footer, `${out}: footer landmark`).toBe(1);
    expect(meta.nav, `${out}: nav landmarks`).toBeGreaterThanOrEqual(1);
    expect(meta.skip, `${out}: skip link`).toBe(true);
    titles.add(meta.title);
    await page.close();
  }

  expect(titles.size, "titles are unique per page").toBe(outs.length);
  await context.close();
});

test("the reference subnav appears on exactly the reference pages", async ({ browser }) => {
  const context = await browser.newContext();
  const withSubnav = [];

  for (const out of allPages()) {
    const page = await context.newPage();
    await page.goto(site.url(out));

    if ((await page.locator('nav[aria-label="Reference"]').count()) > 0) {
      withSubnav.push(out);
    }
    await page.close();
  }

  expect(withSubnav.sort(), "exactly the pages the Reference menu lists").toEqual(REFERENCE_NAV.map((item) => item.out).sort());
  await context.close();
});
