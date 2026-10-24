/**
 * @module core/docs-numbering/index-state
 *
 * Whether a generated index still says what the documents say.
 *
 * Two families own one index each: `docs/adr/ADR.md` over the ADRs and
 * `docs/handoff/HANDOFF.md` over the handoffs, both written by the doctor. An
 * index drifts in two ways and the repair reads both: the rows can be out of
 * order, and the generated text can differ from what the generator would write
 * now - a missing, extra or changed row, or no file at all. Neither is a
 * numbering problem, which is why they live beside the planner instead of
 * inside it.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildAdrIndex, listExistingAdrs } from "../../tools/adr/index.js";
import { buildHandoffIndex, listExistingHandoffs } from "../../tools/handoff/_handoff-index.js";

/**
 * Whether a generated index runs out of order.
 *
 * Each index is generated newest first, and appends are what break it: a
 * repository with no duplicate numbers ended up with 082 above 081 because
 * rows were added by hand over time. Ordering is the condition on purpose - it
 * is what a reader notices, and it does not treat a hand-edited summary as
 * damage.
 *
 * A file holds several tables, each newest first, so each run of adjacent rows
 * is checked on its own.
 *
 * @param {string} indexFile
 * @returns {boolean}
 */
function isUnordered(indexFile) {
  if (!existsSync(indexFile)) {
    return false;
  }

  let previous;

  for (const line of readFileSync(indexFile, "utf8").split("\n")) {
    const row = line.match(/^\|\s*\[(\d+)\]/);

    if (!row) {
      previous = undefined;
      continue;
    }

    const number = Number(row[1]);

    if (previous !== undefined && number > previous) {
      return true;
    }

    previous = number;
  }

  return false;
}

/** Whether any table in `docs/adr/ADR.md` runs out of order. */
export function isAdrIndexUnordered(projectDir) {
  return isUnordered(join(projectDir, "docs", "adr", "ADR.md"));
}

/** Whether any table in `docs/handoff/HANDOFF.md` runs out of order. */
export function isHandoffIndexUnordered(projectDir) {
  return isUnordered(join(projectDir, "docs", "handoff", "HANDOFF.md"));
}

/**
 * Whether a family's index differs from what the generator would write now, or
 * is missing entirely.
 *
 * Ordering is one way an index goes stale; a missing, extra or changed row is
 * the other, and it is the one a new document added by hand leaves behind. A
 * family that has documents but no index is stale by definition: the doctor's
 * job is to write the index the documents describe, whether or not an index
 * file already exists. A family whose directory is absent is not - there is
 * nothing to index, and conjuring a directory is not this repair's decision.
 *
 * The comparison is the generator's own output, so "stale" means exactly "the
 * next doctor run would rewrite it".
 *
 * @param {string} familyDir
 * @param {string} name
 * @param {(dir: string) => string} build
 * @returns {boolean}
 */
function isStale(familyDir, name, build) {
  if (!existsSync(familyDir)) {
    return false;
  }

  const indexFile = join(familyDir, name);

  if (!existsSync(indexFile)) {
    return true;
  }

  try {
    return readFileSync(indexFile, "utf8") !== build(familyDir);
  } catch {
    return false;
  }
}

/** Whether `docs/adr/ADR.md` is missing or behind the ADR files. */
export function isAdrIndexStale(projectDir) {
  return isStale(join(projectDir, "docs", "adr"), "ADR.md", (dir) => buildAdrIndex(listExistingAdrs(dir)));
}

/** Whether `docs/handoff/HANDOFF.md` is missing or behind the handoff files. */
export function isHandoffIndexStale(projectDir) {
  return isStale(join(projectDir, "docs", "handoff"), "HANDOFF.md", (dir) => buildHandoffIndex(listExistingHandoffs(dir)));
}
