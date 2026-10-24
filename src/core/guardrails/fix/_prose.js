/** @module core/fix/prose - the deterministic prose passes: fingerprint and boxes */

import { alignAsciiBoxes, stripFingerprint } from "../../text/index.js";

/**
 * The spelling-only pass: British to American, typographic characters left
 * alone. A code file's arrows and bullets are interface it draws, not
 * punctuation a reader parses, so it gets this one and not the character map.
 *
 * @param {string} text
 * @returns {{ text: string, changed: boolean }}
 */
export function applySpelling(text) {
  const stripped = stripFingerprint(text, { spellingOnly: true });

  return { text: stripped, changed: stripped !== text };
}

/**
 * The full prose pass: fingerprint (typographic characters and spelling) then
 * box alignment, because a drawn box has to be a rectangle.
 *
 * @param {string} text
 * @returns {{ text: string, changed: boolean }}
 */
export function applyProse(text) {
  const stripped = stripFingerprint(text);
  const aligned = alignAsciiBoxes(stripped);

  return { text: aligned, changed: aligned !== text };
}
