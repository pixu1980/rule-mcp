

import { existsSync, renameSync } from "node:fs";
import { join, dirname, basename } from "node:path";

/**
 * Fix phase 1: rename unprefixed component files (must happen before barrel
 * creation, so the barrels see the final names).
 *
 * @param {import("./_conventions.js").FileTreeIssue[]} issues
 * @param {boolean} isDryRun
 * @param {Array<{ path: string, action: string }>} fixed - appended in place
 * @param {Array<{ path: string, error: string }>} errors - appended in place
 */
export function renameUnprefixedFiles(issues, isDryRun, fixed, errors) {
  for (const issue of issues) {
    if (!(issue.type === "wrong-prefix" && issue.fixable)) {
      continue;
    }

    const oldPath = issue.path;
    const dir = dirname(oldPath);
    const oldName = basename(oldPath);
    const newName = `_${oldName}`;
    const newPath = join(dir, newName);

    if (isDryRun) {
      fixed.push({ path: oldPath, action: `[DRY RUN] Rename to ${newName}` });
    } else {
      try {
        if (existsSync(newPath)) {
          errors.push({ path: oldPath, error: `Target "${newName}" already exists. Skipping.` });
          continue;
        }

        renameSync(oldPath, newPath);
        fixed.push({ path: oldPath, action: `Renamed to ${newName}` });
      } catch (error) {
        errors.push({ path: oldPath, error: error.message });
      }
    }
  }
}
