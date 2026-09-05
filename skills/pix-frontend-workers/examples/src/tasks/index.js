/**
 * @module tasks
 *
 * Task registry. The pool worker resolves a task name against this map, and
 * the main-thread fallback uses the identical map - one definition, two
 * execution contexts.
 *
 * Every entry must be a pure function of its payload: no DOM, no `window`, no
 * framework imports, no module-level mutable state.
 */

import { parseCsv } from "./_parse-csv.js";
import { grayscale } from "./_grayscale.js";

export { parseCsv } from "./_parse-csv.js";
export { grayscale } from "./_grayscale.js";

/** @type {Record<string, (payload: any) => unknown>} */
export const TASKS = {
  parseCsv,
  grayscale,
};
