

/**
 * @module scripts/docs-site/rewrite
 *
 * Three passes over a rendered page, and the one decision behind each:
 *
 * - a link that stays in the emitted set becomes the page it points at, so the
 *   site never serves a navigation dead end;
 * - a link that leaves the set becomes a GitHub URL, and every off-site link
 *   opens in a new tab without an opener;
 * - a table gets a scroll container, and the first heading loses its chapter
 *   number, because a reader came for the subject and not the ordinal.
 */

import { execFileSync } from "node:child_process";
import { dirname, join, relative } from "node:path";

import { posix } from "./_collect.mjs";

/**
 * The GitHub blob base for links that leave the emitted set, or null when the
 * clone has no GitHub remote.
 *
 * @param {string} projectDir
 * @returns {string|null}
 */
export function repoBase(projectDir) {
  try {
    const url = execFileSync("git", ["config", "--get", "remote.origin.url"], { encoding: "utf8", cwd: projectDir }).trim();
    const match = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/u.exec(url);

    if (match) {
      return `https://github.com/${match[1]}/blob/main/`;
    }
  } catch {
    // No git or no remote: an off-set link stays relative.
  }

  return null;
}

/**
 * @param {string} html
 * @param {{ dir: string, out: string, routes: Map<string, string>, base: string|null }} options
 * @returns {string}
 */
export function rewriteLinks(html, { dir, out, routes, base }) {
  return html.replaceAll(/(href|src)="([^"]+?)"/gu, (whole, attribute, target) => {
    if (/^(?:https?:|mailto:|#|data:)/u.test(target)) {
      // An external destination opens in a new tab and cannot reach back into
      // this page through window.opener.
      if (attribute === "href" && /^https?:/u.test(target)) {
        return `${attribute}="${target}" target="_blank" rel="noopener noreferrer"`;
      }

      return whole;
    }

    const hash = target.indexOf("#");
    const path = hash === -1 ? target : target.slice(0, hash);
    const fragment = hash === -1 ? "" : target.slice(hash);
    const joined = posix(join(dir, path));
    const resolved = routes.get(joined);

    if (resolved) {
      const from = out === "index.html" ? "." : posix(dirname(out));

      return `${attribute}="${posix(relative(from, resolved))}${fragment}"`;
    }

    // Not a page. A path that climbs out of the tree stays as the author wrote
    // it; anything inside the repository becomes a GitHub URL, so the site
    // never serves a navigation dead end.
    if (joined.startsWith("..")) {
      return whole;
    }

    if (base) {
      const external = ` ${attribute}="${base}${joined}${fragment}"`;

      return attribute === "href" ? `${external} target="_blank" rel="noopener noreferrer"` : external;
    }

    return whole;
  });
}

/**
 * Wrap every table in a scroll container.
 *
 * A wide table (the surface map is 160 rows of four columns) otherwise pushes
 * the whole document wider than the viewport, so a 320px screen scrolls in two
 * directions and WCAG 2.2 SC 1.4.10 reflow fails. The wrapper scrolls instead,
 * which keeps the table element and its implicit roles intact.
 *
 * The wrapper is reachable by keyboard and named by its own header row: a
 * scrollable box a keyboard user cannot focus is content they cannot read
 * (WCAG 2.2 SC 2.1.1, the `scrollable-region-focusable` rule).
 *
 * @param {string} html
 * @returns {string}
 */
export function wrapTables(html) {
  return html.replaceAll(/<table>([\s\S]*?)<\/table>/gu, (whole, inner) => {
    const header = /<thead>[\s\S]*?<tr>([\s\S]*?)<\/tr>/u.exec(inner)?.[1] ?? "";
    const label = header
      .replaceAll(/<[^>]+>/gu, " ")
      .replaceAll(/\s+/gu, " ")
      .trim();

    return `<div data-part="table-scroll" role="region" tabindex="0" aria-label="Table: ${label || "scrollable"}"><table>${inner}</table></div>`;
  });
}

/**
 * Drop the `NN - ` chapter prefix from the first heading of a rendered page.
 *
 * The generated inventories carry it in their H1 (`# 13 - Personas`) because the
 * file name is the route. A reader should see the subject, not the ordinal.
 *
 * @param {string} html
 * @returns {string}
 */
export function stripHeadingNumber(html) {
  return html.replace(/<h1>\d{2}\s*[-:]\s*/u, "<h1>");
}

/**
 * Remove the leading H1 from a Markdown source.
 *
 * A composed page owns one H1, so every source it draws from contributes its
 * sections and not a second title.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function dropLeadingHeading(markdown) {
  return markdown.replace(/^#\s+.*(?:\n|$)/mu, "");
}
