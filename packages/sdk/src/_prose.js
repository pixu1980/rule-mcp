/**
 * @module @rule-mcp/sdk/prose
 *
 * The prose scanners a guardrail uses, gathered from the text subsystems.
 *
 * The subsystems keep their own folders because the server's compression
 * pipeline needs all of them; a rule needs these four, so this is the slice
 * the package's entry point offers.
 */

export { findFingerprints } from "./text/fingerprint/index.js";
export { scanCodeForForeign, scanDocumentForForeign, scanPathForForeign } from "./text/en-english/index.js";
export { findRaggedBoxes } from "./text/ascii-box/index.js";
