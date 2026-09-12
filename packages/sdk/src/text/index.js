/**
 * @module @rule-mcp/sdk/text
 *
 * The text subsystems whole: fingerprint rewriting, the English scanners and
 * the ASCII box aligner.
 *
 * The root entry point exports the handful of scanners a guardrail uses. This
 * one is for a caller that needs the rest - the server's own compression
 * pipeline rewrites with it, which is why the modules live here rather than
 * being duplicated on both sides.
 */

export * from "./fingerprint/index.js";
export * from "./en-english/index.js";
export * from "./ascii-box/index.js";
