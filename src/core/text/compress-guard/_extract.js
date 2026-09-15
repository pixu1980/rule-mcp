

/**
 * @module core/text/compress-guard/extract
 *
 * The structural extractors the compression guard compares before and after a
 * pass. Ported from the compression-reference companion skill's `validate.py`
 * (`extract_headings`, `extract_code_blocks`, `extract_urls`, `extract_paths`,
 * `count_bullets`), so the JS pipeline and the python CLI agree on what
 * "structure survived" means.
 *
 * The fence extractor follows CommonMark: a closing fence uses the same
 * character, is at least as long as the opening one, and carries no info
 * string - which is what lets a 4-backtick block wrap 3-backtick content.
 * Unclosed fences are skipped, exactly as the python does, because including
 * them turns malformed markdown into a false-positive violation.
 */

import { FENCE_RE } from "../_fence.js";

const URL_RE = /https?:\/\/[^\s)]+/g;
const HEADING_RE = /^(#{1,6})\s+(.*)$/gm;
const BULLET_RE = /^[ \t]*[*+-][ \t]+/gm;
// Crude but effective: either a path prefix (./ ../ / or a drive letter) or a
// separator inside the match. Same expression as validate.py's PATH_REGEX.
const PATH_RE = /(?:\.\/|\.\.\/|\/|[A-Za-z]:\\)[\w\-/\\.]+|[\w\-.]+[/\\][\w\-/\\.]+/g;

/**
 * Headings as `"<hashes> <title>"` strings, in document order.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function extractHeadings(text) {
  return [...text.matchAll(HEADING_RE)].map(([, hashes, title]) => `${hashes} ${title.trim()}`);
}

/**
 * Fenced code blocks, fence lines included, in document order.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function extractCodeBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const open = FENCE_RE.exec(lines[index]);

    if (!open) {
      index += 1;
      continue;
    }

    const fenceChar = open[2][0];
    const fenceLength = open[2].length;
    const block = [lines[index]];
    let closed = false;
    index += 1;

    while (index < lines.length) {
      const close = FENCE_RE.exec(lines[index]);

      block.push(lines[index]);
      index += 1;

      if (close && close[2][0] === fenceChar && close[2].length >= fenceLength && close[3].trim() === "") {
        closed = true;
        break;
      }
    }

    if (closed) {
      blocks.push(block.join("\n"));
    }
  }

  return blocks;
}

/**
 * The set of URLs, order-independent.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
export function extractUrls(text) {
  return new Set(text.match(URL_RE));
}

/**
 * The set of filesystem-shaped tokens, order-independent.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
export function extractPaths(text) {
  return new Set(text.match(PATH_RE));
}

/**
 * How many list bullets the text carries.
 *
 * @param {string} text
 * @returns {number}
 */
export function countBullets(text) {
  return (text.match(BULLET_RE) ?? []).length;
}
