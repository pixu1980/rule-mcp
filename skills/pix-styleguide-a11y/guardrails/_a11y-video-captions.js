/** Guardrail `a11y-video-captions`: Video offers captions. */
import { a11yRule } from "./_a11y-helpers.js";

export const a11yVideoCaptions = a11yRule({
  id: "a11y-video-captions",
  wcag: "1.2.2",
  label: "Video offers captions",
  description: "A video element with no captions track excludes anyone who cannot hear it, and anyone in a room where sound is not an option.",
  suggestion: 'Add <track kind="captions" src="..." srclang="..." label="...">',
  find: (code) => [...code.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gi)].map((m) => m[0]).filter((block) => !/kind\s*=\s*["']?captions/i.test(block)),
});
