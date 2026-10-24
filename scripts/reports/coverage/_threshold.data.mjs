/**
 * The branch-coverage ratchet (execution plan, phase 7).
 *
 * `pnpm test:coverage` fails when measured branch coverage over src/ + bin/
 * drops below this floor. The target is 95: raise the floor as targeted tests
 * land (it may only go up - lowering it needs the same justification as
 * deleting a test), until it reaches the target and becomes the gate the plan
 * asked for.
 *
 * Statements, lines and functions are past the target (95.6 / 95.6 / 95.9 as
 * measured). Branches trail because the remaining gaps are one to five per
 * file across roughly 260 files rather than a few untested modules, so the
 * floor rises a point at a time.
 */
export const BRANCH_FLOOR = 92;
export const BRANCH_TARGET = 95;
