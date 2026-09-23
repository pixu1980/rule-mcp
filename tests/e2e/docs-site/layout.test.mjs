

/**
 * Layout of the emitted docs site, measured in Chromium.
 *
 * Three properties a stylesheet can only be trusted to hold once something
 * renders it: every band of a page starts on the same x, one type scale runs
 * from h1 to body without inverting, and every text group clears 4.5:1 in both
 * themes.
 */

import { expect, test } from "@playwright/test";

import { installSite, NAV_PAGES, PROSE_PAGES, TABLE_PAGES } from "./_site.mjs";

const site = installSite(test);

test("header, content, and footer share one container width on every page group", async ({ browser }) => {
  const context = await browser.newContext();
  const widths = new Map();

  for (const out of ["index.html", ...NAV_PAGES]) {
    const page = await context.newPage();
    await page.goto(site.url(out));

    const edges = await page.evaluate(() => {
      const rect = (element) => element.getBoundingClientRect();
      const header = document.querySelector("body > header");
      const subnav = document.querySelector('nav[aria-label="Reference"] ul li');
      const main = document.querySelector("main");

      return {
        brand: Math.round(rect(header.querySelector("p")).left),
        subnav: subnav ? Math.round(rect(subnav).left) : null,
        main: Math.round(rect(main).left),
        footer: Math.round(rect(document.querySelector("footer")).left),
        mainWidth: Math.round(main.getBoundingClientRect().width),
        headerSticky: getComputedStyle(header).position,
      };
    });

    expect(edges.headerSticky, `${out}: header stays stuck`).toBe("sticky");
    // Brand, subnav, content, and footer start on the same gutter.
    expect(Math.abs(edges.brand - edges.main), `${out}: header/content left edge`).toBeLessThanOrEqual(1);
    expect(Math.abs(edges.footer - edges.main), `${out}: footer/content left edge`).toBeLessThanOrEqual(1);
    if (edges.subnav !== null) {
      expect(Math.abs(edges.subnav - edges.main), `${out}: subnav/content left edge`).toBeLessThanOrEqual(1);
    }
    widths.set(out, edges.mainWidth);
    await page.close();
  }

  // One content width everywhere, not a narrow measure on some pages.
  expect(new Set(widths.values()).size, `a single main width, got ${JSON.stringify([...widths])}`).toBe(1);
  await context.close();
});

test("identifier cells never wrap, on any table, at any width", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
  const wrapped = [];

  for (const out of [...TABLE_PAGES, "docs/instructions.html", "docs/resources.html", "docs/personas.html"]) {
    const page = await context.newPage();
    await page.goto(site.url(out));

    const offenders = await page.evaluate(() => {
      const found = [];

      for (const cell of document.querySelectorAll("td")) {
        const code = cell.firstElementChild;

        // A cell whose only element is a code span holds a bare identifier.
        if (code?.tagName === "CODE" && cell.childElementCount === 1 && code.getClientRects().length !== 1) {
          found.push(code.textContent.trim().slice(0, 40));
        }
      }

      return found;
    });

    for (const name of offenders) {
      wrapped.push(`${out}: ${name}`);
    }
    await page.close();
  }

  expect(wrapped, "a command, tool, skill or prompt name stays one token").toEqual([]);
  await context.close();
});

test("type scale is monotonic and text stays above the 12px floor", async ({ browser }) => {
  const context = await browser.newContext();

  for (const out of ["index.html", ...PROSE_PAGES, ...TABLE_PAGES]) {
    const page = await context.newPage();
    await page.goto(site.url(out));

    const type = await page.evaluate(() => {
      const px = (selector) => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
      const body = getComputedStyle(document.body);
      const table = document.querySelector("table");
      const code = document.querySelector("code");

      return {
        h1: px("main h1"),
        h2: document.querySelector("main h2") ? px("main h2") : null,
        h3: document.querySelector("main h3") ? px("main h3") : null,
        body: parseFloat(body.fontSize),
        lineRatio: parseFloat(body.lineHeight) / parseFloat(body.fontSize),
        table: table ? parseFloat(getComputedStyle(table).fontSize) : null,
        code: code ? parseFloat(getComputedStyle(code).fontSize) : null,
      };
    });

    expect(type.h1, `${out}: h1 exists`).toBeGreaterThan(0);
    if (type.h2 !== null) {
      expect(type.h1, `${out}: h1 above h2`).toBeGreaterThan(type.h2);
    }
    if (type.h2 !== null && type.h3 !== null) {
      expect(type.h2, `${out}: h2 above h3`).toBeGreaterThanOrEqual(type.h3);
    }
    expect(type.body, `${out}: body text floor`).toBeGreaterThanOrEqual(12);
    expect(type.lineRatio, `${out}: line height ratio`).toBeGreaterThanOrEqual(1.5);
    if (type.table !== null) {
      expect(type.table, `${out}: table text floor`).toBeGreaterThanOrEqual(12);
    }
    if (type.code !== null) {
      expect(type.code, `${out}: code text floor`).toBeGreaterThanOrEqual(12);
    }
    await page.close();
  }

  await context.close();
});
