

/**
 * @module scripts/docs-site/collect
 *
 * Which Markdown files become public pages.
 *
 * The ADR log, the handoffs and the working documents (audits, plans, reviews)
 * stay in the repository and are not published: they record what happened, and
 * a public page that explains a change instead of a behavior is the copy that
 * goes stale.
 */

import { readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { COMPOSED_PAGES, MERGED_SOURCES, routeOf } from "./_pages.mjs";

/** The repository root this module's tree belongs to. */
export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {string} path
 * @returns {string} the same path with `/` separators
 */
export const posix = (path) => path.split(sep).join("/");

const PRUNE = new Set(["node_modules", ".git"]);
const EXCLUDED_PREFIXES = ["docs/adr/", "docs/handoff/", "docs/audits/", "docs/plans/", "docs/reviews/"];

/**
 * @param {string} rel - posix-relative path from the project root
 * @returns {boolean}
 */
function isPublicSource(rel) {
  if (EXCLUDED_PREFIXES.some((prefix) => rel === prefix.slice(0, -1) || rel.startsWith(prefix))) {
    return false;
  }

  return rel === "README.md" || (rel.startsWith("docs/") && rel.endsWith(".md"));
}

function markdownUnder(absolute) {
  const found = [];
  const walk = (dir) => {
    let entries;

    // The tree is read while other processes run in it: the shipped
    // template-engine tests create and delete a `test-tmp` directory at the
    // repository root, so a directory read here can be gone before it is
    // read, and a file can be gone before it is typed. Both are simply not
    // part of the snapshot this call is taking. `withFileTypes` answers
    // directory-ness from the directory read itself, so no second stat can
    // fail on an entry that just vanished.
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!PRUNE.has(entry.name)) {
          walk(full);
        }
      } else if (entry.name.endsWith(".md")) {
        found.push(full);
      }
    }
  };

  walk(absolute);

  return found;
}

/**
 * Every page the site emits: the root README plus the public `docs/**`.
 *
 * A composed page replaces its sources, so a merged chapter has one route
 * rather than a page nobody links to.
 *
 * @param {string} [projectDir]
 * @returns {Array<{ src: string, out: string, sources?: string[], title?: string }>}
 */
export function collectPages(projectDir = root) {
  const sources = markdownUnder(projectDir)
    .map((full) => posix(relative(projectDir, full)))
    .filter(isPublicSource);
  const pages = sources.filter((src) => !MERGED_SOURCES.has(src)).map((src) => ({ src, out: routeOf(src) }));

  for (const page of COMPOSED_PAGES) {
    pages.push({ src: page.sources[0], out: page.out, sources: [...page.sources], title: page.title });
  }

  return pages.sort((left, right) => left.out.localeCompare(right.out));
}
