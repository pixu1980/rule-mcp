

/**
 * @module core/docs-numbering/index-state
 *
 * Whether `docs/adr/ADR.md` still says what the ADR files say.
 *
 * Two ways it can drift, and the repair reads both: the rows can be out of
 * order, and the set of rows can differ from the files on disk. Neither is a
 * numbering problem, which is why they live beside the planner instead of
 * inside it.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildAdrIndex, listExistingAdrs } from "../../tools/adr/index.js";

/**
 * Whether any table in `docs/adr/ADR.md` runs out of order.
 *
 * The index is generated newest first (ADR 050), and appends are what break it:
 * a repository with no duplicate numbers ended up with 082 above 081 because
 * rows were added by hand over time. Ordering is the condition on purpose - it
 * is what a reader notices, and it does not treat a hand-edited summary as
 * damage.
 *
 * The file holds several tables, each newest first, so each run of adjacent
 * rows is checked on its own.
 *
 * @param {string} projectDir
 * @returns {boolean}
 */
export function isAdrIndexUnordered(projectDir) {
  const indexFile = join(projectDir, "docs", "adr", "ADR.md");

  if (!existsSync(indexFile)) {
    return false;
  }

  let previous;

  for (const line of readFileSync(indexFile, "utf8").split("\n")) {
    const row = line.match(/^\|\s*\[(\d{3})\]/);

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

/**
 * Whether `docs/adr/ADR.md` differs from what the generator would write now.
 *
 * Ordering is one way an index goes stale; a missing, extra or changed row is
 * the other, and it is the one a new ADR added by hand leaves behind. The
 * comparison is the generator's own output, so "stale" means exactly "the next
 * `rule_tool_process_adr` call would rewrite it".
 *
 * @param {string} projectDir
 * @returns {boolean}
 */
export function isAdrIndexStale(projectDir) {
  const adrDir = join(projectDir, "docs", "adr");
  const indexFile = join(adrDir, "ADR.md");

  if (!existsSync(indexFile)) {
    return false;
  }

  try {
    return readFileSync(indexFile, "utf8") !== buildAdrIndex(listExistingAdrs(adrDir));
  } catch {
    return false;
  }
}
