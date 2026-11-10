/**
 * @module packages/docs/build - render Markdown to static HTML.
 *
 * docs/ plus the root README stay the source of truth. This module owns the
 * walk that turns them into pages: collect the public routes, render each one,
 * rewrite its links, and copy the shell assets. Which route a source takes is
 * in `./_pages.mjs`, which links are rewritten and why in `./_rewrite.mjs`, and
 * which files are public in `./_collect.mjs`.
 *
 * Run `pnpm docs:build [outDir]` (default site-dist/); `pnpm docs:dev` serves
 * the same output locally.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { marked } from "marked";

import { copyAssets } from "./_assets.mjs";
import { collectPages, posix, root } from "./_collect.mjs";
import { addHeadingIds, decorate } from "./_decorate.mjs";
import { sourceMap } from "./_pages.mjs";
import { dropLeadingHeading, repoBase, rewriteLinks, stripHeadingNumber, unwrapDeadLinks, wrapTables } from "./_rewrite.mjs";
import { layout, titleOf } from "./_shell.mjs";

export { collectPages } from "./_collect.mjs";

/** The holder and the years, as LICENSE states them on its first line. */
const COPYRIGHT = /Copyright \(c\)\s+([^.\n]+)/u;

/**
 * The copyright the footer states. It is read from LICENSE, so the site, the
 * license file and the SPDX headers keep saying the same thing.
 *
 * @param {string} projectDir
 * @returns {string}
 */
function copyrightLine(projectDir) {
  const firstLine = readFileSync(join(projectDir, "LICENSE"), "utf8").split("\n", 1)[0] ?? "";
  const holder = COPYRIGHT.exec(firstLine)?.[1].trim();

  return holder ? `Copyright (c) ${holder}` : "";
}

/**
 * The title of a page and the HTML of its body.
 *
 * A composed page takes its title from the route and an H1 per source is
 * dropped, so the document still has exactly one H1.
 *
 * @param {{ src: string, sources?: string[], title?: string }} page
 * @param {string} projectDir
 * @returns {{ title: string, body: string }}
 */
function renderPage(page, projectDir) {
  const read = (src) => readFileSync(join(projectDir, src), "utf8");

  if (!page.sources) {
    const markdown = read(page.src);

    return { title: titleOf(markdown, page.src), body: marked.parse(markdown) };
  }

  const sections = page.sources.map((src) => marked.parse(dropLeadingHeading(read(src)))).join("\n");

  return { title: page.title, body: `<h1>${page.title}</h1>\n${sections}` };
}

/**
 * Render every page into outDir, then copy the stylesheet and scripts.
 *
 * @param {{ projectDir?: string, outDir?: string }} [options]
 * @returns {Array<{ src: string, out: string }>}
 */
export function buildSite({ projectDir = root, outDir = join(root, "site-dist") } = {}) {
  const pages = collectPages(projectDir);
  const routes = sourceMap(pages);
  const base = repoBase(projectDir);
  // What the home page states about itself: the release version the root
  // manifest carries, and the repository the source lives in. The site reads the
  // root, because the release stamps that one and every package with it.
  const version = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8")).version;
  const repo = base ? base.replace(/\/blob\/[^/]+\/$/u, "") : null;
  const copyright = copyrightLine(projectDir);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  for (const page of pages) {
    const { title, body } = renderPage(page, projectDir);
    const dir = posix(dirname(page.src) === "." ? "" : dirname(page.src));
    const html = unwrapDeadLinks(rewriteLinks(addHeadingIds(decorate(stripHeadingNumber(wrapTables(body)), page.out)), { dir, out: page.out, routes, base }));
    const file = join(outDir, page.out);

    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, layout({ title, out: page.out, body: html, pages, version, repo, copyright }));
  }

  copyAssets(outDir, projectDir);

  return pages;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pages = buildSite({ outDir: process.argv[2] ? join(process.cwd(), process.argv[2]) : undefined });

  process.stdout.write(`docs-site: wrote ${pages.length} page(s).\n`);
}
