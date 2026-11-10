/**
 * The page change: no transition to wait for, and no unstyled frame.
 *
 * The site used to declare a cross-document view transition. It is gone: the
 * browser held the old snapshot for 0.25s on every navigation, which reads as
 * latency on a documentation site, and the "Reduce motion" switch existed only
 * to turn that single animation off, so the switch went with it. This test pins
 * the removal and the property the transition was hiding: the new page paints
 * its stored theme, its field and its text on the first frame.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { installSite } from "./_site.mjs";

const site = installSite(test);

const DARK_BG = "rgb(17, 23, 36)";

test("the stylesheet declares no page transition and no animation", () => {
  const css = readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "packages", "docs", "style.css"), "utf8");

  expect(css, "no cross-document transition is declared").not.toMatch(/@view-transition/u);
  expect(css, "no transition root is named").not.toMatch(/view-transition-name/u);
  expect(css, "no keyframes are defined").not.toMatch(/@keyframes/u);
});

test("the preferences menu offers no motion switch", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(site.url("index.html"));

  await expect(page.locator('input[name="motion"]'), "the motion switch left with the transition").toHaveCount(0);
  await expect(page.locator('input[name="contrast"]'), "the display group still holds the contrast switch").toHaveCount(1);

  await context.close();
});

test("a page change never paints an unstyled or empty frame", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const frames = [];
  let calls = 0;

  await context.addInitScript(() => {
    localStorage.setItem("rule-mcp-docs-prefs", JSON.stringify({ theme: "dark" }));
  });

  const page = await context.newPage();

  // The page reports its first frame through a binding, so nothing is assigned
  // onto the global object and the sample survives the navigation.
  await page.exposeBinding("__recordFrame", (_source, frame) => {
    frames.push(frame);
  });
  await page.exposeBinding("__recordTransitionCall", () => {
    calls += 1;
  });
  await page.addInitScript(() => {
    const original = Document.prototype.startViewTransition;

    if (typeof original === "function") {
      Document.prototype.startViewTransition = function spied(...args) {
        globalThis.__recordTransitionCall();

        return Reflect.apply(original, document, args);
      };
    }

    requestAnimationFrame(() => {
      globalThis.__recordFrame({
        theme: document.documentElement.dataset.theme ?? null,
        background: getComputedStyle(document.body).backgroundColor,
        text: (document.body?.innerText ?? "").trim().length,
      });
    });
  });

  await page.goto(site.url("index.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector("header nav a[href$='getting-started.html']").click());
  await page.waitForURL(/getting-started/u);
  await page.waitForFunction(() => document.body.innerText.includes("Getting started"));

  const first = frames.at(-1);

  expect(first?.theme, "the stored theme is on the root before the first frame").toBe("dark");
  expect(first?.background, "the body paints the dark field on the first frame").toBe(DARK_BG);
  expect(first?.text, "the first frame already carries the page").toBeGreaterThan(200);
  expect(calls, "no script starts a transition of its own").toBe(0);

  await context.close();
});
