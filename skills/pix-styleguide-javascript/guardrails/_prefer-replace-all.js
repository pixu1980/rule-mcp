/** Guardrail `js-prefer-replace-all`: replaceAll over replace with /g regex */
import { countedVerdict } from "../../../src/shared/index.js";
export const jsPreferReplaceAll = {
  id: "js-prefer-replace-all",
  label: "replaceAll over replace with /g regex",
  description: "str.replace(/x/g, y) with a global regex literal should be str.replaceAll('x', y).",
  check: (code) => {
    const violations = code.match(/\.replace\s*\(\s*\/[^/]*\/g\s*[,)]/g) || [];

    if (violations.length === 0) {
      return { pass: true, note: "No global-regex replace found" };
    }

    return countedVerdict(violations, { suggestion: "Use String.prototype.replaceAll with a string pattern: str.replaceAll('-', ' ')." });
  },
};
