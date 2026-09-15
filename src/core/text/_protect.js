

/**
 * @module core/text/protect
 *
 * The one place that decides what a compression pass may not touch inside a
 * line: inline code spans, URLs and filesystem-shaped tokens. Both passes use
 * it, so "protected" means the same thing in both.
 *
 * Placeholders are NUL-delimited rather than space-delimited: a
 * space-delimited index collides with an ordinary number in prose, and
 * restoring it would splice a code span into the middle of a sentence.
 */

/** Applied in order: URLs before paths, because a URL carries slashes too. */
const PROTECT_RES = [/`[^`]*`/g, /https?:\/\/\S+/g, /(?:\.\/|\.\.\/|\/|[A-Za-z]:\\)[\w\-/\\.]+|[\w\-.]+[/\\][\w\-/\\.]+/g];

/** The placeholder delimiter, exported so a word rule can look past one. */
export const PLACEHOLDER_CHAR = String.fromCodePoint(0);

const RESTORE_RE = new RegExp(String.raw`${PLACEHOLDER_CHAR}(\d+)${PLACEHOLDER_CHAR}`, "g");

/**
 * Replace every protected span with a placeholder.
 *
 * @param {string} text
 * @returns {{ work: string, spans: string[] }}
 */
export function protectSpans(text) {
  const spans = [];
  let work = text;

  for (const pattern of PROTECT_RES) {
    work = work.replaceAll(pattern, (match) => {
      spans.push(match);

      return `${PLACEHOLDER_CHAR}${spans.length - 1}${PLACEHOLDER_CHAR}`;
    });
  }

  return { work, spans };
}

/**
 * Put the protected spans back, byte for byte.
 *
 * @param {string} text
 * @param {string[]} spans
 * @returns {string}
 */
export function restoreSpans(text, spans) {
  return text.replaceAll(RESTORE_RE, (_, index) => spans[Number(index)]);
}
