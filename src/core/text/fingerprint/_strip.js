/** @module core/text/fingerprint/strip - rewrite the fingerprints away, line by line */

import { cleanLine, looksLikeJson } from "./_rewrite-line.js";
import { fingerprintEnabled, scannableProse } from "./_scan.js";

/**
 * Clean a block of prose/markdown. Fenced code passes through untouched, and
 * JSON is returned as-is.
 *
 * @param {string} text
 * @param {{ spellingOnly?: boolean }} [options] spellingOnly keeps the spelling
 *   rules and leaves typographic characters alone - see cleanLine
 * @returns {string}
 */
export function stripFingerprint(text, options = {}) {
  if (typeof text !== "string" || text.length === 0) {
    return text;
  }
  if (looksLikeJson(text)) {
    return text;
  }

  const out = [];
  let isInFence = false;
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      isInFence = !isInFence;
      out.push(line);
      continue;
    }

    out.push(isInFence ? line : cleanLine(line, options.spellingOnly === true));
  }

  return out.join("\n");
}

/**
 * Clean an MCP tool result. Only prose text items are touched; a new object is
 * returned so the cached core is never mutated.
 *
 * @param {{ content?: Array<{ type: string, text?: string }> }} result
 * @returns {object} the same result when disabled, else a cleaned copy
 */
export function stripFingerprintResult(result) {
  if (!fingerprintEnabled()) {
    return result;
  }

  if (!result || !Array.isArray(result.content)) {
    return result;
  }

  const content = result.content.map((item) => {
    if (item && item.type === "text" && typeof item.text === "string" && !looksLikeJson(item.text)) {
      return { ...item, text: stripFingerprint(item.text) };
    }

    return item;
  });

  return { ...result, content };
}
