/**
 * @module core/text/fence
 *
 * The CommonMark fenced-code rule, in one place: a fence opens with three or
 * more backticks or tildes indented at most three spaces, and closes only on
 * the same character, at least as long, with nothing after it.
 *
 * Treating every ``` line as a toggle looks equivalent and is not: a
 * four-backtick block wrapping three-backtick content flips the state twice
 * and hands the enclosed code to the prose rules. `docs/02-tools-operations.md`
 * is exactly that shape, and the compression guard is what caught it.
 */

/** groups: 1 indent, 2 fence run, 3 info string. */
export const FENCE_RE = /^(\s{0,3})(`{3,}|~{3,})(.*)$/;

/**
 * The fence this line opens, or null if it opens none.
 *
 * @param {string} line
 * @returns {{ char: string, length: number }|null}
 */
export function fenceOpenedBy(line) {
  const match = FENCE_RE.exec(line);

  return match ? { char: match[2][0], length: match[2].length } : null;
}

/**
 * Does this line close the fence that is currently open?
 *
 * @param {string} line
 * @param {{ char: string, length: number }} fence
 * @returns {boolean}
 */
export function fenceClosedBy(line, fence) {
  const match = FENCE_RE.exec(line);

  return Boolean(match) && match[2][0] === fence.char && match[2].length >= fence.length && match[3].trim() === "";
}
