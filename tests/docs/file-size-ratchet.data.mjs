/**
 * File-size ratchet: every file that exceeded the 150-line cap when the
 * budget test landed, with the line count it had then. A file may only
 * shrink: going over its recorded size fails the build, and dropping to
 * 150 or less means its entry must be deleted. An entry is added only as the
 * adoption baseline for a root the cap has just reached, recorded in the ADR
 * that added it - ADR 112 did this for skills/ - so that new entries are
 * otherwise forbidden. Data file: exempt from the size cap itself.
 */

export const FILE_SIZE_RATCHET = new Map([
  // Adopted with the skills/ root (ADR 112): these six were over the cap before
  // it reached them. Each entry goes away as its split lands in ARCH-7.
  ["skills/rule-frontend-custom-element/scripts/scaffold-component.mjs", 697],
  ["skills/rule-frontend-template-engine/assets/template-engine/_renderer.js", 412],
  ["skills/rule-frontend-template-engine/assets/template-engine/_filters.js", 381],
  ["skills/rule-frontend-template-engine/assets/template-engine/_expression-parser.js", 371],
  ["skills/rule-frontend-vanilla-reactive/examples/src/core/template-engine/_template-instance.js", 335],
  ["skills/rule-frontend-workers/examples/src/workers/_worker-pool.js", 264],
]);
