/**
 * @module core/text/line-shape
 *
 * Per-line shape guards: is this line code, or a `key: value` pair, rather
 * than a sentence? Ported from the compression-reference companion skill's
 * `detect.py` (`CODE_PATTERNS`, the YAML indicator heuristic).
 *
 * Both compression passes share them, so a code-shaped line or a frontmatter
 * key is exempt by construction rather than by each rule remembering to check.
 */

/** A line that looks like code, whatever file it sits in. */
const CODE_PATTERNS = [
  /^\s*(?:import |from .+ import |require\(|const |let |var )/,
  /^\s*(?:def |class |function |async function |export )/,
  /^\s*(?:if\s*\(|for\s*\(|while\s*\(|switch\s*\(|try\s*\{)/,
  /^\s*[\])};]+\s*$/,
  /^\s*@\w+/,
  /^\s*"[^"]+"\s*:\s*/,
  /^\s*\w+\s*=\s*[["'({]/,
];

/** A YAML-ish line: a `key: value` pair. */
export const YAML_KEY_RE = /^\w[\w\s]*:\s/;

/**
 * Does this line look like code?
 *
 * @param {string} line
 * @returns {boolean}
 */
export function isCodeLine(line) {
  return CODE_PATTERNS.some((pattern) => pattern.test(line));
}

/**
 * Is this single line a `key: value` pair rather than a sentence? Frontmatter
 * and inline config read as prose to a word rule, and lose their keys to it.
 *
 * @param {string} line
 * @returns {boolean}
 */
export function isYamlLine(line) {
  const trimmed = line.trim();

  return trimmed === "---" || YAML_KEY_RE.test(trimmed);
}
