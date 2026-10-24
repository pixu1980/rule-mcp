/** @module scripts/docs-site/shell - one semantic document shell for every page */

import { depthPrefix, escapeHtml } from "./_html.mjs";
import { nav, referenceNav, stripChapterNumber } from "./_nav.mjs";

/** Matches prefs.js's STORAGE_KEY; duplicated because the two run in different worlds (server-side generator vs. static client asset). */
const STORAGE_KEY = "rule-mcp-docs-prefs";

/**
 * A blocking script, not deferred, that applies a stored theme/contrast/motion
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
    '  if (prefs.motion === "reduce") root.dataset.motion = "reduce";',
    "})();",
    "</script>",
  ].join("\n");
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
      ["motion", "reduce", "Reduce motion", "checkbox"],
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
 * @param {{ title: string, out: string, body: string, pages: Array<{ out: string, title?: string }> }} options
 * @returns {string}
 */
export function layout({ title, out, body, pages }) {
  const prefix = depthPrefix(out);

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    `<title>${escapeHtml(title)} · rule-mcp</title>`,
    themeScript(),
    `<link rel="stylesheet" href="${prefix}style.css">`,
    `<script src="${prefix}prefs.js" defer></script>`,
    `<script src="${prefix}transitions.js" defer></script>`,
    "</head>",
    `<body data-page="${out === "index.html" ? "home" : "doc"}">`,
    '<a href="#main">Skip to content</a>',
    "<header>",
    `<p><a href="${prefix}index.html">rule-mcp</a></p>`,
    '<nav aria-label="Primary"><ul>',
    nav(pages, out),
    "</ul></nav>",
    ...preferences(),
    "</header>",
    referenceNav(out),
    '<main id="main" tabindex="-1">',
    body,
    "</main>",
    "<footer><p>Generated from <code>docs/</code>, edit the Markdown, not this file.</p></footer>",
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
