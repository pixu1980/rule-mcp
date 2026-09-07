/** @module core/review/docs/plan-ids */

import { splitRow } from "./_table.js";

/** One checklist step: `- [ ] **Step 3 - SEC-1, SEC-2 (high)**: ...` (checked or not). */
const CHECKBOX_STEP = /^- \[( |x|X)\] \*\*Step \d+ - ([^(]+?)\s*\(/;

/** The ids named in one step's bold prefix; a step may close more than one finding. */
function idsOf(cell) {
  const ids = [];

  for (const part of cell.split(",")) {
    const id = part.trim();

    if (/^[A-Za-z][\w-]*-\d+$/.test(id)) {
      ids.push(id);
    }
  }

  return ids;
}

/**
 * The finding ids a plan's steps point at, in the order they appear.
 *
 * Reads the checklist form the renderer writes now and the table form older
 * plans still carry, so the gate keeps working across the transition. Anything
 * not shaped like an id, a dash for "nothing" among them, is ignored rather
 * than reported as dangling.
 *
 * @param {string} plan
 * @returns {string[]}
 */
export function planFindingIds(plan) {
  const ids = [];

  for (const line of plan.split("\n")) {
    const step = CHECKBOX_STEP.exec(line);

    if (step) {
      ids.push(...idsOf(step[2]));
      continue;
    }

    if (!line.trimStart().startsWith("|")) {
      continue;
    }

    const cells = splitRow(line);

    // | Step | Finding(s) | ... |
    if (cells.length < 3 || cells[0] === "Step" || !/^\d+$/.test(cells[0].trim())) {
      continue;
    }

    ids.push(...idsOf(cells[1]));
  }

  return ids;
}

/**
 * The finding ids whose step is marked `[x]` in an existing plan, so a sync
 * can re-render without losing what somebody already executed.
 *
 * @param {string} plan
 * @returns {Set<string>}
 */
export function planCheckedIds(plan) {
  const checked = new Set();

  for (const line of plan.split("\n")) {
    const step = CHECKBOX_STEP.exec(line);

    if (step && step[1] !== " ") {
      for (const id of idsOf(step[2])) {
        checked.add(id);
      }
    }
  }

  return checked;
}
