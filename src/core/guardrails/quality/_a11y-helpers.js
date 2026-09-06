/** Literal-masking and context helpers used by the a11y guardrail family. */

/** Lines short enough to hand-write; a kilobytes-long line is generated output. */
function scannableLines(code, cap = 2000) {
  return code.split("\n").filter((line) => line.length > 0 && line.length <= cap);
}

/** Extensions that contain markup worth checking. */
const MARKUP_EXTENSION = /\.(?:html?|vue|svelte|astro|jsx|tsx|php|erb|twig)$/;
const STYLE_EXTENSION = /\.(?:css|scss|less|sass)$/;

/** @param {object} context @returns {boolean} */
function isMarkup(context) {
  const fileName = context?.fileName ?? "";

  return fileName ? MARKUP_EXTENSION.test(fileName) : false;
}

/** @param {object} context @returns {boolean} */
function isStyles(context) {
  const fileName = context?.fileName ?? "";

  return fileName ? STYLE_EXTENSION.test(fileName) : false;
}

/**
 * Build a markup rule. `find` returns the offending fragments.
 */
function a11yRule(spec) {
  const applies = spec.applies ?? isMarkup;

  return {
    id: spec.id,
    wcag: spec.wcag,
    label: spec.label,
    description: spec.description,
    check: (code, context) => {
      if (!applies(context)) {
        return { pass: true, note: "Not a file this rule applies to, skipping" };
      }

      const hits = spec.find(code);

      return {
        pass: hits.length === 0,
        failCount: hits.length,
        detail: hits.slice(0, 10).map((h) => h.slice(0, 80)),
        suggestion: `${spec.suggestion} (WCAG ${spec.wcag})`,
      };
    },
  };
}

/**
 * The real CSS out of whatever was handed over: a .css file, fenced css,
 * replaceSync sheets, <style> blocks, or a bare stylesheet.
 */

export { scannableLines, MARKUP_EXTENSION, STYLE_EXTENSION, isMarkup, isStyles, a11yRule };

export { maskLiterals } from "../_util.js";
