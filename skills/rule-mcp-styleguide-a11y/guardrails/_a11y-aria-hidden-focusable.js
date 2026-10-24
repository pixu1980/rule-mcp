/** Guardrail `a11y-aria-hidden-focusable`: Nothing focusable is aria-hidden. */
import { a11yRule } from "./_a11y-helpers.js";

export const a11yAriaHiddenFocusable = a11yRule({
  id: "a11y-aria-hidden-focusable",
  wcag: "4.1.2",
  label: "Nothing focusable is aria-hidden",
  description: "aria-hidden on a focusable element leaves it in the tab order while removing it from the accessibility tree, so focus lands on nothing announceable.",
  suggestion: "Remove aria-hidden, or remove the element from the tab order too",
  find: (code) =>
    [
      ...code.matchAll(/<(?:a|button|input|select|textarea)\b[^>]*aria-hidden\s*=\s*["']?true["']?[^>]*>/gi),
      ...code.matchAll(/<[^>]*aria-hidden\s*=\s*["']?true["']?[^>]*tabindex\s*=\s*["']?0["']?[^>]*>/gi),
    ].map((m) => m[0]),
});
