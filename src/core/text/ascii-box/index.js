/**
 * @module core/text/ascii-box
 *
 * Makes a drawn box an actual rectangle.
 *
 * A diagram whose right edge steps in and out by a column is the one AI
 * fingerprint a spell-check cannot see. It happens because the characters are
 * chosen a line at a time and nothing counts the columns, and it is immediately
 * visible to a reader who would otherwise have trusted the diagram.
 *
 * The pass is deliberately narrow. It pads short frame lines out to the widest
 * line of the same box and it does nothing else: it never truncates, never
 * moves an inner separator, never invents a missing border, and never touches a
 * line that is not part of a box. Anything it cannot fix safely it leaves for
 * `findRaggedBoxes` to report.
 *
 * Boxes are grouped by their opening corner and its indentation, so a small
 * inset box beside a full-width one keeps its own size rather than being
 * stretched to match.
 *
 * @see src/tools/router - where it runs on every tool result
 * @see src/core/guardrail-defs - ai-box-rectangular, the guard
 * @see scripts/clean-prose - the same pass over this repository's own files
 */

export * from "./_width.js";
export * from "./_frames.js";
export * from "./_align.js";
