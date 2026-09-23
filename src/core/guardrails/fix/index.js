

/**
 * @module core/fix
 *
 * The deterministic half of the guardrails: the fixes a machine can apply
 * without judgment, so the model spends its turns on the findings that need
 * one. `fixText` dispatches by extension:
 *
 * - a JavaScript file gets the style passes (blank lines, braces, one-liners)
 *   and the spelling pass;
 * - a prose file gets the full fingerprint pass (typographic characters,
 *   spelling) and box alignment;
 * - anything else gets the spelling pass only, because an installer's arrow is
 *   interface it draws, not punctuation a reader parses.
 */

import { extname } from "node:path";

import { applyJsStyle } from "./_js-style.js";
import { applyProse, applySpelling } from "./_prose.js";

export * from "./_js-style.js";
export * from "./_prose.js";

/** Extensions the JavaScript style passes apply to. */
const JS = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts"]);

/** Extensions read as prose, which get the full fingerprint pass. */
const PROSE = new Set([".md", ".mdx", ".markdown", ".txt"]);

/**
 * The deterministic fixes for one file's text.
 *
 * @param {string} text
 * @param {{ file?: string }} [options]
 * @returns {{ text: string, changed: boolean, passes: string[] }}
 */
export function fixText(text, { file = "" } = {}) {
  const ext = extname(file).toLowerCase();
  const passes = [];
  let current = text;

  if (JS.has(ext)) {
    const style = applyJsStyle(current);

    if (style.changed) {
      passes.push("js-style");
    }

    current = style.text;

    const spelling = applySpelling(current);

    if (spelling.changed) {
      passes.push("spelling");
    }

    current = spelling.text;
  } else if (PROSE.has(ext)) {
    const prose = applyProse(current);

    if (prose.changed) {
      passes.push("prose");
    }

    current = prose.text;
  } else {
    const spelling = applySpelling(current);

    if (spelling.changed) {
      passes.push("spelling");
    }

    current = spelling.text;
  }

  return { text: current, changed: current !== text, passes };
}
