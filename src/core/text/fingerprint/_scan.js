

/** @module core/text/fingerprint/scan - find the fingerprints without changing anything */

import { DASH_RE, ISE_RE, OGUE_RE, OUR_RE, RE_RE, TYPOGRAPHIC_RE, WORD_RE } from "./_patterns.js";

/**
 * The part of a text the transformer is allowed to rewrite: prose, with fenced
 * blocks, inline spans and URLs blanked out.
 *
 * The detector and the transformer must agree on this, exactly. If they drift,
 * a guardrail fails on a line the transformer refuses to fix, and there is no
 * way for anyone to make it pass.
 *
 * @param {string} text
 * @returns {string}
 */
export function scannableProse(text) {
  const lines = [];
  let isInFence = false;

  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      isInFence = !isInFence;
      lines.push("");
      continue;
    }
    lines.push(isInFence ? "" : line.replaceAll(/`[^`]*`/g, " ").replaceAll(/https?:\/\/\S+/g, " "));
  }

  return lines.join("\n");
}

/**
 * Report the fingerprints in a text without rewriting it. Used by the
 * guardrails, which have to name what failed rather than silently fix it.
 *
 * Code and URLs are exempt for the same reason the transformer skips them: an
 * identifier is not prose. Everything else counts, comments and plain string
 * literals included - a British spelling in a user-facing message is still one.
 *
 * @param {string} text
 * @returns {{ dashes: string[], typographic: string[], british: string[] }}
 */
export function findFingerprints(text) {
  if (typeof text !== "string" || text.length === 0) {
    return { dashes: [], typographic: [], british: [] };
  }

  const scannable = scannableProse(text);
  const british = [];

  for (const pattern of [WORD_RE, OUR_RE, ISE_RE, RE_RE, OGUE_RE]) {
    british.push(...(scannable.match(pattern) ?? []));
  }

  return {
    dashes: scannable.match(DASH_RE) ?? [],
    typographic: scannable.match(TYPOGRAPHIC_RE) ?? [],
    british: [...new Set(british)],
  };
}

/**
 * Whether the transformer runs at all.
 * Opt out with RULE_MCP_NO_FINGERPRINT=1.
 *
 * @returns {boolean}
 */
export function fingerprintEnabled() {
  return process.env.RULE_MCP_NO_FINGERPRINT !== "1";
}
