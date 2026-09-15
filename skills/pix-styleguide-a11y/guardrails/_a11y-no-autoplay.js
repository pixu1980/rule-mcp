/** Guardrail `a11y-no-autoplay`: Media does not autoplay with sound. */
import { a11yRule } from "./_a11y-helpers.js";

export const a11yNoAutoplay = a11yRule({
  id: "a11y-no-autoplay",
  wcag: "1.4.2",
  label: "Media does not autoplay with sound",
  description: "Audio starting on load competes with a screen reader and cannot be stopped by someone who has not found the control yet.",
  suggestion: "Remove autoplay, or add muted and a visible control",
  find: (code) => [...code.matchAll(/<(?:audio|video)\b[^>]*\bautoplay\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => !/\bmuted\b/i.test(tag)),
});
