/** Shared guardrail shapes: the typed skip gate and the counted verdict. */

/** Extensions that select TypeScript checks. */
export const TS_EXTENSION = /\.(?:ts|tsx|mts|cts)$/;

/** Syntax that only compiles as TypeScript, for calls that pass no file name. */
export const TS_SYNTAX = /^\s*(?:export\s+)?(?:interface|type)\s+\w+\s*[=<{]|:\s*(?:string|number|boolean|unknown|any)\b/m;

/**
 * Whether a check applies to a file: a .ts* name wins, otherwise the code has
 * to look like TypeScript.
 *
 * @param {string} code
 * @param {{ fileName?: string }} [context]
 * @returns {boolean}
 */
export function isTypeScriptFile(code, context = {}) {
  const fileName = context.fileName ?? "";

  if (fileName) {
    return TS_EXTENSION.test(fileName);
  }

  return TS_SYNTAX.test(code);
}

/**
 * The skip verdict the typed rules return for non-TypeScript input, or null
 * when the rule should run.
 *
 * @param {string} code
 * @param {{ fileName?: string }} [context]
 * @returns {{ pass: true, note: string }|null}
 */
export function tsSkipResult(code, context = {}) {
  if (isTypeScriptFile(code, context)) {
    return null;
  }

  return { pass: true, note: "Not a TypeScript file, skipping" };
}

/**
 * The counted verdict: a zero-length list passes, anything else fails with the
 * first `maxDetail` entries (trimmed when asked) and an optional suggestion.
 *
 * @param {string[]} violations
 * @param {{ maxDetail?: number, suggestion?: string, trim?: boolean }} [options]
 */
export function countedVerdict(violations, { maxDetail = 5, suggestion, trim = false } = {}) {
  const detail = (trim ? violations.map((entry) => entry.trim()) : violations).slice(0, maxDetail);

  return {
    pass: violations.length === 0,
    failCount: violations.length,
    detail,
    ...(suggestion && { suggestion }),
  };
}

/** The all-pass verdict: no failures, optional note. */
export function passResult(note = "") {
  return { pass: true, failCount: 0, detail: [], suggestion: "", ...(note && { note }) };
}
