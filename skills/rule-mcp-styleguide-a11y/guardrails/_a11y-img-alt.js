/** Guardrail `a11y-img-alt`: Images carry a text alternative. */
import { a11yRule } from "./_a11y-helpers.js";

export const a11yImgAlt = a11yRule({
  id: "a11y-img-alt",
  wcag: "1.1.1",
  label: "Images carry a text alternative",
  description: "Every img needs alt. An empty alt is a valid answer for decoration; a missing one is not an answer at all.",
  suggestion: 'Add alt="..." with the information the image carries, or alt="" if it is decorative',
  find: (code) => [...code.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => !/\balt\s*=/i.test(tag)),
});
