

import { scanFileTree } from "./_scan.js";
import { renameUnprefixedFiles } from "./_fix-rename.js";
import { createMissingBarrels, populateEmptyBarrels } from "./_fix-barrels.js";

/**
 * Auto-fix file tree issues in a directory.
 * Applies fixes in a safe order:
 *   1. Rename unprefixed component files
 *   2. Create missing barrel files
 *   3. Populate empty barrels
 *
 * @param {string} rootDir - Project root
 * @param {object} [options]
 * @param {string} [options.srcDir="src"] - Source directory
 * @param {boolean} [options.dryRun=false] - Preview without applying
 * @returns {{
 *   ok: boolean,
 *   fixed: Array<{ path: string, action: string }>,
 *   errors: Array<{ path: string, error: string }>,
 *   remaining: import("./_conventions.js").FileTreeIssue[]
 * }}
 */
export function autoFixFileTree(rootDir, options = {}) {
  const isDryRun = options.dryRun !== false;
  const report = scanFileTree(rootDir, options);
  const fixed = [];
  const errors = [];

  renameUnprefixedFiles(report.issues, isDryRun, fixed, errors);
  createMissingBarrels(report.issues, isDryRun, fixed, errors);
  populateEmptyBarrels(report.issues, isDryRun, fixed, errors);

  const fixableTypes = new Set(["missing-barrel", "wrong-prefix", "empty-barrel"]);
  const remaining = report.issues.filter((index) => !fixableTypes.has(index.type));

  return {
    ok: errors.length === 0,
    fixed,
    errors,
    remaining,
    dryRun: isDryRun,
  };
}
