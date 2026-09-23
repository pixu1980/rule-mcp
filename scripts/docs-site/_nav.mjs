

/**
 * @module scripts/docs-site/nav
 *
 * The three menus the shell renders, and the labels they carry.
 *
 * The top-level menu is fixed: Home, Getting Started, Reference. The Reference
 * menu is the published order of that section, and a page renders it only when
 * the menu lists it, so the subnav never claims a page the section does not own.
 */

import { depthPrefix, escapeHtml } from "./_html.mjs";

/** Top-level public nav: Home / Getting Started / Reference. */
export const PRIMARY_NAV = [
  { out: "index.html", title: "Home" },
  { out: "docs/getting-started.html", title: "Getting Started" },
  { out: "docs/README.html", title: "Reference" },
];

/** Reference submenu, in the order the section is meant to be read. */
export const REFERENCE_NAV = [
  { out: "docs/README.html", title: "Overview" },
  { out: "docs/architecture.html", title: "Architecture" },
  { out: "docs/surface-map.html", title: "Surface map" },
  { out: "docs/instructions.html", title: "Instructions" },
  { out: "docs/prompts.html", title: "Prompts" },
  { out: "docs/guardrails.html", title: "Guardrails" },
  { out: "docs/personas.html", title: "Personas" },
  { out: "docs/resources.html", title: "Resources" },
  { out: "docs/cli.html", title: "CLI" },
  { out: "docs/env-variables.html", title: "Env vars" },
];

const REFERENCE_OUTS = new Set(REFERENCE_NAV.map((item) => item.out));

/**
 * @param {string} current
 * @returns {boolean}
 */
export function isReferencePage(current) {
  return REFERENCE_OUTS.has(current);
}

/**
 * Drop the `NN - ` chapter prefix a generated document carries in its H1, so a
 * reader sees `Personas` and not `13 - Personas`.
 *
 * @param {string} value
 * @returns {string}
 */
export function stripChapterNumber(value) {
  return String(value)
    .replace(/^\d{2}\s*[-:]\s*/u, "")
    .trim();
}

/**
 * Humanize a docs path when Markdown has no H1.
 * @param {string} out
 * @returns {string}
 */
function labelFromOut(out) {
  const base = out.replace(/^docs\//u, "").replace(/\.html$/u, "");
  const slug = base.replace(/^\d\d-/u, "");

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * @param {{ out: string, title?: string }} page
 * @returns {string}
 */
export function navLabel(page) {
  const raw = typeof page.title === "string" && page.title.trim() ? page.title.trim() : labelFromOut(page.out);

  return stripChapterNumber(raw) || raw;
}

/**
 * @param {Array<{ out: string, title: string }>} items
 * @param {string} current
 * @returns {string}
 */
function renderNavList(items, current) {
  return items
    .map((item) => {
      const href = `${depthPrefix(current)}${item.out}`;
      const here = item.out === current ? ' aria-current="page"' : "";

      return `<li><a href="${href}"${here}>${escapeHtml(item.title)}</a></li>`;
    })
    .join("\n");
}

/**
 * @param {Array<{ out: string, title?: string }>} _pages
 * @param {string} current
 * @returns {string}
 */
export function nav(_pages, current) {
  return renderNavList(PRIMARY_NAV, current);
}

/**
 * @param {string} current
 * @returns {string}
 */
export function referenceNav(current) {
  if (!isReferencePage(current)) {
    return "";
  }

  return ['<nav aria-label="Reference">', "<ul>", renderNavList(REFERENCE_NAV, current), "</ul>", "</nav>"].join("\n");
}
