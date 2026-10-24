/** Guardrail `a11y-iframe-title`: Frames are named. */
import { a11yRule } from "./_a11y-helpers.js";

export const a11yIframeTitle = a11yRule({
  id: "a11y-iframe-title",
  wcag: "4.1.2",
  label: "Frames are named",
  description: 'An iframe with no title is announced as "frame", which tells the user nothing about whether to enter it.',
  suggestion: 'Add title="..." describing what the frame contains',
  find: (code) => [...code.matchAll(/<iframe\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => !/\btitle\s*=/i.test(tag)),
});
