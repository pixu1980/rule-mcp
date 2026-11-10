/**
 * The brand kit on the site: the marks are served, sized, and accessible.
 *
 * The kit names three canonical assets. The header takes the monochrome mark
 * as a mask so it stays crisp at 34px, the home hero takes the primary icon in
 * its own rounded field, and the tab takes the same monochrome file.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { darkContext, installSite, ROOT } from "./_site.mjs";

const site = installSite(test);

test("every mark is served, and the images the page loads decode", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(site.url("index.html"));

  const marks = await page.evaluate(async () => {
    const urls = ["assets/color-mark.png", "assets/primary-icon.png", "assets/monochrome-mark.png"];
    const loaded = {};

    for (const url of urls) {
      const response = await fetch(url);

      loaded[url] = response.status;
    }

    const plate = document.querySelector("[data-part='brand-plate'] img");

    return {
      loaded,
      plateSrc: plate?.getAttribute("src") ?? null,
      plateAlt: plate?.getAttribute("alt") ?? null,
      plateDecoded: plate ? plate.complete && plate.naturalWidth > 0 : false,
      markMasked: getComputedStyle(document.querySelector("[data-part='brand-mark']")).maskImage.includes("monochrome-mark"),
      favicon: document.querySelector("link[rel='icon']")?.getAttribute("href") ?? null,
    };
  });

  for (const [url, status] of Object.entries(marks.loaded)) {
    expect(status, `${url} is served`).toBe(200);
  }

  expect(marks.plateSrc, "the hero loads the primary icon").toContain("primary-icon.png");
  expect(marks.plateDecoded, "the hero icon decodes").toBe(true);
  expect(marks.plateAlt, "the icon is decorative: the heading names the product").toBe("");
  expect(marks.markMasked, "the header recolors the monochrome mark").toBe(true);
  expect(marks.favicon, "the tab carries the monochrome mark").toContain("monochrome-mark.png");

  await context.close();
});

test("both themes take the brand palette, and the wordmark is lowercase", async ({ browser }) => {
  for (const { name, context } of [
    { name: "light", context: await browser.newContext() },
    { name: "dark", context: await darkContext(browser) },
  ]) {
    const page = await context.newPage();

    await page.goto(site.url("index.html"));

    const read = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const brand = document.querySelector("header p[data-part='brand'] a");

      return {
        accent: style.getPropertyValue("--accent").trim(),
        wordmark: brand?.textContent.trim() ?? "",
        headingFont: getComputedStyle(document.querySelector("h1")).fontFamily,
      };
    });

    expect(read.wordmark, `${name}: the wordmark is the canonical spelling`).toBe("rule-mcp");
    expect(read.headingFont, `${name}: headings end in the sans stack`).toMatch(/sans-serif$/u);
    expect(read.headingFont, `${name}: the display serif is gone`).not.toMatch(/Palatino|Georgia|Iowan/u);

    if (name === "dark") {
      expect(read.accent.toLowerCase(), "the dark theme accent is the brand cyan").toBe("#63ddff");
    }

    await context.close();
  }
});

test("the home page states its version and links the repository", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(site.url("index.html"));

  const meta = await page.evaluate(() => {
    const line = document.querySelector("[data-part='meta']");
    const repo = line?.querySelector("a[data-part='repo']");

    return {
      version: line?.querySelector("[data-part='version']")?.textContent.trim() ?? "",
      href: repo?.getAttribute("href") ?? "",
      label: repo?.textContent.trim() ?? "",
      icon: Boolean(repo?.querySelector("svg")),
      inHero: Boolean(line?.closest("section[data-part='hero']")),
    };
  });
  const declared = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;

  expect(meta.version, "the version is the release the root manifest carries").toBe(`v${declared}`);
  expect(meta.href, "the link opens the repository").toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/u);
  expect(meta.label, "the link is named, not an icon alone").toBe("GitHub");
  expect(meta.icon, "the GitHub mark travels with the link").toBe(true);
  expect(meta.inHero, "the line sits in the hero, not at the foot of the page").toBe(true);

  await context.close();
});
