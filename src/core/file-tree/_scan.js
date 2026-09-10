

import { existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { isIgnored } from "./_conventions.js";
import { componentFolderIssues, bareFileIssues, orphanCssIssues, staleBarrelIssues } from "./_scan-checks.js";

/**
 * @typedef {Object} FileTreeReport
 * @property {boolean} pass - true if zero issues
 * @property {import("./_conventions.js").FileTreeIssue[]} issues - All detected issues
 * @property {Object} stats - Summary statistics
 * @property {number} stats.totalFiles - Files scanned
 * @property {number} stats.totalDirs - Directories scanned
 * @property {number} stats.missingBarrel - Barrel count
 * @property {number} stats.wrongPrefix - Wrong prefix count
 * @property {number} stats.bareFiles - Bare file count
 * @property {number} stats.fixable - Fixable issue count
 */

/**
 * Scan a directory recursively and collect all file tree issues.
 *
 * @param {string} rootDir - Project root to scan
 * @param {object} [options]
 * @param {string} [options.srcDir="src"] - Source directory to scan (default: src)
 * @param {boolean} [options.autoFix=false] - Whether to apply fixes
 * @returns {FileTreeReport}
 */
export function scanFileTree(rootDir, options = {}) {
  const srcDir = options.srcDir || "src";
  const target = join(rootDir, srcDir);
  const issues = [];

  let totalFiles = 0;
  let totalDirectories = 0;

  if (!existsSync(target)) {
    return {
      pass: true,
      issues: [],
      stats: { totalFiles: 0, totalDirs: 0, missingBarrel: 0, wrongPrefix: 0, bareFiles: 0, fixable: 0 },
    };
  }

  /** Recursive scanner */
  function scan(currentPath, depth = 0) {
    let entries;

    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    const directories = entries.filter((e) => e.isDirectory());
    const files = entries.filter((e) => e.isFile());

    totalDirectories += directories.length;
    totalFiles += files.length;

    const dirName = basename(currentPath);
    const isComponentLike = /^[A-Z]/.test(dirName) && directories.length + files.length > 0;

    // Only validate component folders (PascalCase directories under src/)
    if (isComponentLike && depth >= 1) {
      issues.push(...componentFolderIssues(files, currentPath, dirName));
    }

    // Component-looking files outside a component folder
    if (!isComponentLike || depth === 0) {
      issues.push(...bareFileIssues(files, currentPath));
    }

    issues.push(...orphanCssIssues(files, currentPath), ...staleBarrelIssues(files, currentPath));

    for (const dir of directories) {
      if (!isIgnored(dir.name)) {
        scan(join(currentPath, dir.name), depth + 1);
      }
    }
  }

  scan(target);

  const stats = {
    totalFiles,
    totalDirs: totalDirectories,
    missingBarrel: issues.filter((index) => index.type === "missing-barrel").length,
    wrongPrefix: issues.filter((index) => index.type === "wrong-prefix").length,
    bareFiles: issues.filter((index) => index.type === "bare-file").length,
    fixable: issues.filter((index) => index.fixable).length,
  };

  return {
    pass: issues.length === 0,
    issues,
    stats,
  };
}
