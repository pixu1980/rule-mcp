/**
 * The branch-coverage ratchet (execution plan, phase 7).
 *
 * `pnpm test:coverage` fails when measured branch coverage over src/ + bin/
 * drops below this floor. The target is 95: raise the floor as targeted tests
 * land (it may only go up - lowering it needs the same justification as
 * deleting a test), until it reaches the target and becomes the gate the plan
 * asked for.
 */
export const BRANCH_FLOOR = 83;
export const BRANCH_TARGET = 95;
