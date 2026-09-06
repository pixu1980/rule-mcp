import { findFingerprints } from "../../../fingerprint.js";

/** Guardrail `fp-no-emdash`: No em or en dashes */
export const fpNoEmdash = {
  id: "fp-no-emdash",
  label: "No em or en dashes",
  description: "Prose uses ASCII punctuation. An em dash becomes a comma; an en dash becomes a hyphen.",
  check: (code) => {
    const { dashes } = findFingerprints(code);

    return {
      pass: dashes.length === 0,
      failCount: dashes.length,
      detail: [...new Set(dashes)],
      suggestion: "Replace an em dash with a comma and an en dash with a hyphen, or run pix_compress.",
    };
  },
};
