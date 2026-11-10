/** @module packages/docs/shell - one semantic document shell for every page */

import { depthPrefix, escapeHtml } from "./_html.mjs";
import { nav, referenceNav, stripChapterNumber } from "./_nav.mjs";

/** Matches prefs.js's STORAGE_KEY; duplicated because the two run in different worlds (server-side generator vs. static client asset). */
const STORAGE_KEY = "rule-mcp-docs-prefs";

/**
 * A blocking script, not deferred, that applies a stored theme/contrast
 * preference to `<html>` before the stylesheet link below it loads. Without
 * this, `prefs.js` (deferred) only runs after the browser can have already
 * painted the default theme, flashing it for anyone whose stored preference
 * differs from their OS setting.
 */
function themeScript() {
  return [
    "<script>",
    "(function () {",
    "  var prefs;",
    "  try {",
    `    prefs = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}) || "{}");`,
    "  } catch (error) {",
    "    prefs = {};",
    "  }",
    "  var root = document.documentElement;",
    '  if (prefs.theme && prefs.theme !== "system") root.dataset.theme = prefs.theme;',
    '  if (prefs.contrast === "more") root.dataset.contrast = "more";',
    "})();",
    "</script>",
  ].join("\n");
}

/** The GitHub mark, inline: the site takes no icon dependency for one glyph. */
const GITHUB_ICON =
  '<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';

/**
 * The line under the home heading: what this build is, and where the code is.
 *
 * @param {{ version?: string, repo?: string|null }} meta
 * @returns {string}
 */
function homeMeta({ version = "", repo = null } = {}) {
  const parts = [];

  if (version) {
    parts.push(`<span data-part="version">v${escapeHtml(version)}</span>`);
  }

  if (repo) {
    // Off-site, so it opens in a new tab without an opener, like every other.
    parts.push(`<a data-part="repo" href="${escapeHtml(repo)}" target="_blank" rel="noopener noreferrer">${GITHUB_ICON}GitHub</a>`);
  }

  return parts.length === 0 ? "" : `<p data-part="meta">${parts.join("")}</p>\n`;
}

/** The preference menu: theme, then the two display switches. */
const PREFERENCE_GROUPS = [
  {
    legend: "Theme",
    inputs: [
      ["theme", "system", "System", "radio"],
      ["theme", "light", "Light", "radio"],
      ["theme", "dark", "Dark", "radio"],
    ],
  },
  {
    legend: "Display",
    inputs: [
      ["contrast", "more", "More contrast", "checkbox"],
    ],
  },
];

function preferences() {
  const groups = PREFERENCE_GROUPS.flatMap(({ legend, inputs }) => [
    `<li><fieldset><legend>${legend}</legend>`,
    ...inputs.map(([name, value, label, type]) => {
      const id = `prefs-${name}-${value}`;

      return `<label for="${id}"><input id="${id}" type="${type}" name="${name}" value="${value}"> ${label}</label>`;
    }),
    "</fieldset></li>",
  ]);

  return ['<details data-part="prefs"><summary>Preferences</summary>', "<menu>", ...groups, "</menu>", "</details>"];
}

/**
 * @param {{ title: string, out: string, body: string, pages: Array<{ out: string, title?: string }>, version?: string, repo?: string|null, copyright?: string }} options
 * @returns {string}
 */
export function layout({ title, out, body, pages, version = "", repo = null, copyright = "" }) {
  const prefix = depthPrefix(out);
  const home = out === "index.html";
  // The build line belongs to the hero: as a loose child of the home grid it
  // was auto-placed after the last area, at the bottom of the page.
  const meta = home ? homeMeta({ version, repo }) : "";
  const content = meta === "" ? body : body.replace('<section data-part="hero">', `<section data-part="hero">\n${meta}`);

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    `<title>${title === "rule-mcp" ? "rule-mcp - deterministic MCP server" : `${escapeHtml(title)} · rule-mcp`}</title>`,
    themeScript(),
    `<link rel="icon" href="${prefix}assets/monochrome-mark.png" type="image/png" sizes="512x512">`,
    `<link rel="apple-touch-icon" href="${prefix}assets/primary-icon.png">`,
    `<link rel="stylesheet" href="${prefix}style.css">`,
    `<script src="${prefix}prefs.js" defer></script>`,
    "</head>",
    `<body data-page="${home ? "home" : "doc"}">`,
    '<a href="#main">Skip to content</a>',
    "<header>",
    `<p data-part="brand"><a href="${prefix}index.html"><span data-part="brand-mark" aria-hidden="true"></span> rule-mcp</a></p>`,
    '<nav aria-label="Primary"><ul>',
    nav(pages, out),
    "</ul></nav>",
    ...preferences(),
    "</header>",
    referenceNav(out),
    '<main id="main" tabindex="-1">',
    content,
    "</main>",
    "<footer>",
    `<p>Generated from <code>docs/</code>, edit the Markdown, not this file.</p>${copyright === "" ? "" : `\n<p data-part="copyright">${escapeHtml(copyright)}</p>`}`,
    "</footer>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/**
 * The `<title>` of a page: its H1 with any `NN - ` chapter prefix removed.
 *
 * @param {string} markdown
 * @param {string} fallback
 * @returns {string}
 */
export function titleOf(markdown, fallback) {
  const raw = /^# (.+)$/mu.exec(markdown)?.[1].trim() ?? fallback;

  return stripChapterNumber(raw) || raw;
}
