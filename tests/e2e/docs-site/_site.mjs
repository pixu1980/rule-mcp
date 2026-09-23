

/**
 * @module tests/e2e/docs-site/_site
 *
 * One built site served over HTTP for the whole file that asks for it.
 *
 * Each spec builds and serves its own copy, so a spec file can run alone and
 * two spec files cannot see each other's output directory.
 */

import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

import { collectPages } from "../../../scripts/docs-site/_collect.mjs";
import { buildSite } from "../../../scripts/docs-site/build.mjs";
import { PRIMARY_NAV, REFERENCE_NAV } from "../../../scripts/docs-site/_nav.mjs";

export { REFERENCE_NAV } from "../../../scripts/docs-site/_nav.mjs";

export const ROOT = join(import.meta.dirname, "..", "..", "..");

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

/** Every page the top-level nav and the Reference menu reach. */
export const NAV_PAGES = [...PRIMARY_NAV, ...REFERENCE_NAV.slice(1)].map((item) => item.out);
export const TABLE_PAGES = ["docs/surface-map.html", "docs/guardrails.html", "docs/tools.html"];
export const PROSE_PAGES = ["docs/getting-started.html", "docs/architecture.html", "docs/instructions.html", "docs/README.html"];

/** Every emitted page. */
export const allPages = () => collectPages(ROOT).map((page) => page.out);

function serve(outDir) {
  return createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = join(outDir, pathname.endsWith("/") ? `${pathname}index.html` : pathname.slice(1));

    if (!file.startsWith(outDir)) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }

    try {
      const body = readFileSync(file);
      response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("not found");
    }
  });
}

/**
 * Build the site once for this spec file and serve it until the file ends.
 *
 * @param {import("@playwright/test").TestType} test - the spec file's `test`
 * @returns {{ url: (out: string) => string }}
 */
export function installSite(test) {
  let server = null;
  let outDir = "";
  let base = "";

  test.beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), "rule-docs-site-"));
    buildSite({ projectDir: ROOT, outDir });
    server = serve(outDir);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server?.close(resolve));
    rmSync(outDir, { recursive: true, force: true });
  });

  return { url: (out) => `${base}/${out}` };
}

/**
 * A dark-scheme context with the docs dark theme already selected, so the
 * stored preference and the media query agree.
 *
 * @param {import("@playwright/test").Browser} browser
 * @returns {Promise<import("@playwright/test").BrowserContext>}
 */
export async function darkContext(browser) {
  const context = await browser.newContext({ colorScheme: "dark" });

  await context.addInitScript(() => {
    localStorage.setItem("rule-mcp-docs-prefs", JSON.stringify({ theme: "dark" }));
  });

  return context;
}
