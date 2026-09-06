/** @module scripts/fix/self-guardrails/decl - what counts as a declaration line */

/** Is this line a declaration opener we can still extend? */
export const DECL = /^\s*(?:export\s+)?(?:const|let|var|function|class|async\s+function)\b/;
/** Lines that continue a multi-line declaration. */
export const CONTINUES = (line) =>
  line.trim() === "" ||
  line.trim() === "}" ||
  line.endsWith("}") ||
  line.endsWith("{") ||
  line.endsWith("(") ||
  /\b(?:=>|return)\s*$/.test(line.trim());
