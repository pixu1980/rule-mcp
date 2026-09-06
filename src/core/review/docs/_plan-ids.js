/** @module core/review/docs/plan-ids */

import { splitRow } from "./_table.js";

/**
 * The finding ids a plan's steps point at, in the order they appear.
 *
 * A step may close more than one finding - two one-line documentation fixes
 * belong in one step and one commit - so the cell is read as a list. Anything
 * that is not shaped like an id, a dash for "nothing" among them, is ignored
 * rather than reported as dangling.
 *
 * @param {string} plan
 * @returns {string[]}
 */
export function planFindingIds(plan) {
  const ids = [];

  for (const line of plan.split("\n")) {
    if (!line.trimStart().startsWith("|")) {
      continue;
    }

    const cells = splitRow(line);

    // | Step | Finding(s) | ... |
    if (cells.length < 3 || cells[0] === "Step" || !/^\d+$/.test(cells[0].trim())) {
      continue;
    }

    for (const part of cells[1].split(",")) {
      const id = part.trim();

      if (/^[A-Za-z][\w-]*-\d+$/.test(id)) {
        ids.push(id);
      }
    }
  }

  return ids;
}
