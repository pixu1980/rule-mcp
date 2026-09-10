

/**
 * @module core/text/compress-guard/guard
 *
 * The deterministic safety check a compression pass has to survive. Ported
 * from the caveman-compress companion skill's `validate.py`, keeping its
 * severities: heading count, code blocks and URLs are errors (structure or a
 * reference was destroyed), path and bullet drift are tolerances (worth
 * reporting, not worth reverting for).
 *
 * This is what lets the vocabulary be aggressive at all: a caller compresses a
 * block, guards it, and keeps the original block when the guard says no.
 */

import { countBullets, extractCodeBlocks, extractHeadings, extractPaths, extractUrls } from "./_extract.js";

/** Bullet-count drift tolerated before it is reported. */
const BULLET_TOLERANCE = 0.15;

/** Members of `a` missing from `b`, as a sorted list. */
const missing = (a, b) => [...a].filter((item) => !b.has(item)).sort();

/**
 * Compare a compressed text against its original.
 *
 * @param {string} original
 * @param {string} compressed
 * @returns {{ ok: boolean, violations: Array<{ rule: string, severity: "error"|"warning", message: string }> }}
 *   `ok` is false only when at least one violation is an error.
 */
export function guardCompression(original, compressed) {
  const violations = [];
  const error = (rule, message) => violations.push({ rule, severity: "error", message });
  const warning = (rule, message) => violations.push({ rule, severity: "warning", message });

  const headingsBefore = extractHeadings(original);
  const headingsAfter = extractHeadings(compressed);

  if (headingsBefore.length !== headingsAfter.length) {
    error("headings", `heading count mismatch: ${headingsBefore.length} vs ${headingsAfter.length}`);
  } else if (headingsBefore.some((heading, index) => heading !== headingsAfter[index])) {
    warning("headings", "heading text or order changed");
  }

  const blocksBefore = extractCodeBlocks(original);
  const blocksAfter = extractCodeBlocks(compressed);

  if (blocksBefore.length !== blocksAfter.length || blocksBefore.some((block, index) => block !== blocksAfter[index])) {
    error("code-blocks", "code blocks not preserved exactly");
  }

  const urlsBefore = extractUrls(original);
  const urlsAfter = extractUrls(compressed);
  const urlsLost = missing(urlsBefore, urlsAfter);
  const urlsAdded = missing(urlsAfter, urlsBefore);

  if (urlsLost.length > 0 || urlsAdded.length > 0) {
    error("urls", `URL mismatch: lost=[${urlsLost.join(", ")}], added=[${urlsAdded.join(", ")}]`);
  }

  const pathsBefore = extractPaths(original);
  const pathsAfter = extractPaths(compressed);
  const pathsLost = missing(pathsBefore, pathsAfter);
  const pathsAdded = missing(pathsAfter, pathsBefore);

  if (pathsLost.length > 0 || pathsAdded.length > 0) {
    warning("paths", `path mismatch: lost=[${pathsLost.join(", ")}], added=[${pathsAdded.join(", ")}]`);
  }

  const bulletsBefore = countBullets(original);
  const bulletsAfter = countBullets(compressed);

  if (bulletsBefore > 0 && Math.abs(bulletsBefore - bulletsAfter) / bulletsBefore > BULLET_TOLERANCE) {
    warning("bullets", `bullet count changed too much: ${bulletsBefore} -> ${bulletsAfter}`);
  }

  return { ok: violations.every((violation) => violation.severity !== "error"), violations };
}
