/** Guardrail `a11y-positive-tabindex`: No positive tabindex. */
import { a11yRule } from "./_a11y-helpers.js";

export const a11yPositiveTabindex = a11yRule({
  id: "a11y-positive-tabindex",
  wcag: "2.4.3",
  label: "No positive tabindex",
  description: "A positive tabindex takes the element out of document order, so focus order stops matching reading order.",
  suggestion: 'Use tabindex="0" and fix the DOM order instead, or tabindex="-1" for programmatic focus',
  find: (code) => [...code.matchAll(/tabindex\s*=\s*["']?([1-9]\d*)["']?/gi)].map((m) => m[0]),
});
