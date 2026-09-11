

/**
 * @module scripts/docs-site/build - render Markdown to static HTML.
 *
 * docs/ plus the root Markdown files stay the source of truth: each one
 * becomes a page mirroring its path (the root README.md becomes
 * index.html). Links that stay inside the emitted set are rewritten to
 * their page; relative links pointing elsewhere in the clone become
 * GitHub blob URLs, so the deployed site never serves a dead link.
 * Run `pnpm docs:build [outDir]` (default site-dist/); `pnpm docs:dev`
 * serves the same output locally.
 */

import { marked } from "marked";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { layout, titleOf } from "./_template.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const posix = (path) => path.split(sep).join("/");

const PRUNE = new Set(["node_modules", ".git"]);

function markdownUnder(absolute) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);

      if (statSync(full).isDirectory()) {
        if (!PRUNE.has(entry)) {
          walk(full);
        }
      } else if (entry.endsWith(".md")) {
        found.push(full);
      }
    }
  };

  walk(absolute);

  return found;
}

/**
 * Every page the site emits: root Markdown plus docs/**, as { src, out }.
 *
 * @param {string} [projectDir] - repository root to walk
 * @returns {Array<{ src: string, out: string }>}
 */
export function collectPages(projectDir = root) {
  const sources = markdownUnder(projectDir)
    .filter((full) => {
      const rel = posix(relative(projectDir, full));

      return rel === "README.md" || rel.startsWith("docs/") || !rel.includes("/");
    })
    .map((full) => posix(relative(projectDir, full)));

  return sources.map((src) => ({ src, out: src === "README.md" ? "index.html" : src.replace(/\.md$/, ".html") }));
}

function repoBase(projectDir) {
  try {
    const url = execFileSync("git", ["config", "--get", "remote.origin.url"], { encoding: "utf8", cwd: projectDir }).trim();
    const match = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/u.exec(url);

    if (match) {
      return `https://github.com/${match[1]}/blob/main/`;
    }
  } catch {
    // No git or no remote: out-of-set links stay relative.
  }

  return null;
}

function rewriteLinks(html, { dir, out, emitted, base }) {
  return html.replaceAll(/(href|src)="([^"]+?)"/gu, (whole, attribute, target) => {
    if (/^(?:https?:|mailto:|#|data:)/u.test(target)) {
      return whole;
    }

    const hash = target.indexOf("#");
    const path = hash === -1 ? target : target.slice(0, hash);
    const fragment = hash === -1 ? "" : target.slice(hash);
    const mapped = path.replace(/(^|\/)README\.md$/u, "$1index.html").replace(/\.md$/u, ".html");
    const resolved = posix(join(dir, mapped));

    if (resolved.startsWith("..")) {
      return whole;
    }

    if (emitted.has(resolved)) {
      const from = out === "index.html" ? "." : posix(dirname(out));
      const link = posix(relative(from, resolved));

      return `${attribute}="${link}${fragment}"`;
    }

    if (base) {
      return `${attribute}="${base}${resolved}${fragment}"`;
    }

    return whole;
  });
}

/**
 * Render every page into outDir and copy the stylesheet.
 *
 * @param {{ projectDir?: string, outDir?: string }} [options]
 * @returns {Array<{ src: string, out: string }>} the emitted pages
 */
export function buildSite({ projectDir = root, outDir = join(root, "site-dist") } = {}) {
  const pages = collectPages(projectDir);
  const emitted = new Set(pages.map((page) => page.out));
  const base = repoBase(projectDir);

  rmSync(outDir, { recursive: true, force: true });

  for (const page of pages) {
    const markdown = readFileSync(join(projectDir, page.src), "utf8");
    const dir = posix(dirname(page.src) === "." ? "" : dirname(page.src));
    const body = rewriteLinks(marked.parse(markdown), { dir, out: page.out, emitted, base });
    const file = join(outDir, page.out);

    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, layout({ title: titleOf(markdown, page.src), out: page.out, body, pages }));
  }

  writeFileSync(join(outDir, "style.css"), readFileSync(join(root, "scripts", "docs-site", "style.css"), "utf8"));

  return pages;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pages = buildSite({ outDir: process.argv[2] ? join(process.cwd(), process.argv[2]) : undefined });

  process.stdout.write(`docs-site: wrote ${pages.length} page(s).\n`);
}
