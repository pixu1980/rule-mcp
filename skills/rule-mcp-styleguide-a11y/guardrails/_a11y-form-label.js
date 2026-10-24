/** Guardrail `a11y-form-label`: Inputs are labeled. */
import { a11yRule } from "./_a11y-helpers.js";

export const a11yFormLabel = a11yRule({
  id: "a11y-form-label",
  wcag: "3.3.2",
  label: "Inputs are labeled",
  description: 'An input with no label, aria-label or aria-labelledby is announced by its type alone, so the user hears "edit text" and nothing else.',
  suggestion: "Associate a label element, or add aria-label / aria-labelledby",
  find: (code) =>
    [...code.matchAll(/<input\b[^>]*>/gi)]
      .map((m) => m[0])
      .filter((tag) => !/type\s*=\s*["']?(?:hidden|submit|button|reset|image)/i.test(tag))
      .filter((tag) => !/\b(?:aria-label|aria-labelledby|id)\s*=/i.test(tag)),
});
