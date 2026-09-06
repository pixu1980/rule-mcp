// Auto-split from src/core/guardrails/quality.js - see ./quality/index.js
import { A11Y_GUARDRAILS } from "./a11y.js";
import { QUALITY_GUARDRAILS_PART1 } from "./parts-1.js";
import { QUALITY_GUARDRAILS_PART2 } from "./parts-2.js";
import { QUALITY_GUARDRAILS_PART3 } from "./parts-3.js";
import { QUALITY_GUARDRAILS_PART4 } from "./parts-4.js";

/** Reassembled quality family: a11y-cited rules plus TS/manifest/simplicity/comment/layout checks. */
export const QUALITY_GUARDRAILS = [
  ...QUALITY_GUARDRAILS_PART1,
  ...QUALITY_GUARDRAILS_PART2,
  ...QUALITY_GUARDRAILS_PART3,
  ...QUALITY_GUARDRAILS_PART4,
];

export { A11Y_GUARDRAILS } from "./a11y.js";
