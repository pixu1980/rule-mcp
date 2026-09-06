import { findFingerprints } from "../../../text/fingerprint/index.js";

/** Guardrail `fp-no-typographic-chars`: No curly quotes or ellipsis glyphs */
export const fpNoTypographicChars = {
  id: "fp-no-typographic-chars",
  label: "No curly quotes or ellipsis glyphs",
  description:
    "Curly quotes and the ellipsis character do not survive a copy-paste into source. Use straight quotes and three dots.",
  check: (code) => {
    const { typographic } = findFingerprints(code);

    return {
      pass: typographic.length === 0,
      failCount: typographic.length,
      detail: [...new Set(typographic)],
      suggestion: "Use straight quotes (\" and ') and ... instead, or run pix_compress.",
    };
  },
};
