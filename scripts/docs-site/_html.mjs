

/** @module scripts/docs-site/html - the two primitives every rendered page needs */

/**
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/**
 * The `../` run a page needs to reach the site root from its own depth.
 *
 * @param {string} out
 * @returns {string}
 */
export function depthPrefix(out) {
  return "../".repeat(out.split("/").length - 1);
}
