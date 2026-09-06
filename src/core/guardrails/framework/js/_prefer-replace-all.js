/** Guardrail `js-prefer-replace-all`: replaceAll over replace with /g regex */
export const jsPreferReplaceAll = {
  id: "js-prefer-replace-all",
  label: "replaceAll over replace with /g regex",
  description: "str.replace(/x/g, y) with a global regex literal should be str.replaceAll('x', y).",
  check: (code) => {
    const violations = code.match(/\.replace\s*\(\s*\/[^/]*\/g\s*[,)]/g) || [];

    if (violations.length === 0) {
      return { pass: true, note: "No global-regex replace found" };
    }

    return {
      pass: false,
      failCount: violations.length,
      detail: violations.slice(0, 5),
      suggestion: "Use String.prototype.replaceAll with a string pattern: str.replaceAll('-', ' ').",
    };
  },
};
