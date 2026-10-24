

/** The emitted HTML: link targets, the shell, and a page composed of two sources. */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, normalize, sep } from "node:path";
import test from "node:test";

import { buildSite } from "../build.mjs";

const root = join(import.meta.dirname, "..", "..", "..");
const posix = (path) => path.split(sep).join("/");

test("the emitted site has no dead internal links among public pages", () => {
  const outDir = mkdtempSync(join(tmpdir(), "rule-mcp-site-"));
  const pages = buildSite({ projectDir: root, outDir });
  const emitted = new Set(pages.map((page) => page.out));
  const dead = [];
  const assetOk = /(?:^|\/)(?:style\.css|prefs\.js|transitions\.js)/u;

  for (const page of pages) {
    const html = readFileSync(join(outDir, page.out), "utf8");

    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gu)) {
      const target = match[1];

      if (/^(?:https?:|mailto:|#|data:)/u.test(target)) {
        continue;
      }

      const hash = target.indexOf("#");
      const path = hash === -1 ? target : target.slice(0, hash);
      const from = page.out === "index.html" ? "." : dirname(page.out);
      const resolved = posix(normalize(join(from, path)));

      if (resolved.startsWith("..") || emitted.has(resolved) || existsSync(join(outDir, resolved)) || assetOk.test(resolved)) {
        continue;
      }

      dead.push(`${page.out}: ${target}`);
    }
  }

  assert.deepEqual(dead, [], "an internal link must resolve to an emitted page or asset");
});

test("nav labels never render undefined; primary trio is present", () => {
  const outDir = mkdtempSync(join(tmpdir(), "rule-mcp-site-nav-"));
  buildSite({ projectDir: root, outDir });

  const html = readFileSync(join(outDir, "index.html"), "utf8");
  const nav = html.match(/<nav aria-label="Primary"><ul>([\s\S]*?)<\/ul><\/nav>/u)?.[1] ?? "";

  assert.doesNotMatch(nav, /\bundefined\b/u, "nav must not render undefined titles");
  assert.match(nav, />Home</u);
  assert.match(nav, />Getting Started</u);
  assert.match(nav, />Reference</u);
});

test("the architecture page renders the flow without a chart library", () => {
  const outDir = mkdtempSync(join(tmpdir(), "rule-mcp-site-flow-"));
  buildSite({ projectDir: root, outDir });

  assert.ok(!existsSync(join(outDir, "vendor")), "no vendored chart library is emitted");

  const arch = readFileSync(join(outDir, "docs", "architecture.html"), "utf8");

  assert.match(arch, /data-part="architecture-diagram"/u);
  assert.match(arch, /data-part="step"/u);
  assert.doesNotMatch(arch, /d3/iu, "the page must not load D3");
  assert.doesNotMatch(arch, /architecture-diagram\.js/u);
});

test("external links open in a new tab with no opener", () => {
  const outDir = mkdtempSync(join(tmpdir(), "rule-mcp-site-links-"));
  const pages = buildSite({ projectDir: root, outDir });
  const bare = [];

  for (const page of pages) {
    const html = readFileSync(join(outDir, page.out), "utf8");

    for (const match of html.matchAll(/<a [^>]*href="https?:\/\/[^"]*"[^>]*>/gu)) {
      const anchor = match[0];

      if (!anchor.includes('target="_blank"') || !anchor.includes('rel="noopener noreferrer"')) {
        bare.push(`${page.out}: ${anchor}`);
      }
    }
  }

  assert.deepEqual(bare, [], "every off-site link must carry target and rel");
});

test("the composed instructions page carries both sources under one h1", () => {
  const outDir = mkdtempSync(join(tmpdir(), "rule-mcp-site-composed-"));
  buildSite({ projectDir: root, outDir });

  const html = readFileSync(join(outDir, "docs", "instructions.html"), "utf8");

  assert.equal((html.match(/<h1>/gu) ?? []).length, 1, "a page has exactly one h1");
  assert.match(html, /<h1>Instructions<\/h1>/u);
  // One heading from the hand-written workflow, one from the generated inventory.
  assert.match(html, /Recommended workflow/u);
  assert.match(html, /Agent slash commands/u);
});

test("a table scroll container is reachable by keyboard and named", () => {
  const outDir = mkdtempSync(join(tmpdir(), "rule-mcp-site-scroll-"));
  buildSite({ projectDir: root, outDir });

  const html = readFileSync(join(outDir, "docs", "surface-map.html"), "utf8");
  const wrapper = /<div data-part="table-scroll"[^>]*>/u.exec(html)?.[0] ?? "";

  assert.match(wrapper, /tabindex="0"/u, "a keyboard user must be able to scroll the table");
  assert.match(wrapper, /role="region"/u);
  assert.match(wrapper, /aria-label="Table: [^"]+"/u, "a named region, not an anonymous box");
});

test("the preferences menu carries no stray comma between markup fragments", () => {
  const outDir = mkdtempSync(join(tmpdir(), "rule-mcp-site-prefs-"));
  buildSite({ projectDir: root, outDir });

  const html = readFileSync(join(outDir, "index.html"), "utf8");
  const details = /<details data-part="prefs">[\s\S]*?<\/details>/u.exec(html)?.[0] ?? "";

  assert.ok(details, "the preferences details element must be present");
  // layout() joins its fragments with "\n"; a nested array passed unspread
  // stringifies with Array.prototype's default "," separator instead, which
  // renders as a literal comma between every <li>/<label>/</fieldset>.
  assert.doesNotMatch(details, /,\s*</u, "the preferences array must be spread into layout()'s fragment list, not joined with default commas");
});

test("the stored theme applies before the stylesheet loads, so it cannot flash", () => {
  const outDir = mkdtempSync(join(tmpdir(), "rule-mcp-site-theme-"));
  buildSite({ projectDir: root, outDir });

  const html = readFileSync(join(outDir, "index.html"), "utf8");
  const inlineMatch = /<script>(?:(?!<\/script>)[\s\S])*rule-mcp-docs-prefs[\s\S]*?<\/script>/u.exec(html);
  const stylesheetIndex = html.indexOf('<link rel="stylesheet"');

  assert.ok(inlineMatch, "a non-deferred inline script must apply the stored theme before first paint");
  assert.ok(inlineMatch.index < stylesheetIndex, "the theme script must run before the stylesheet link, or the default theme paints first and flashes");
});
