import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { listFiles } from "../tokensave/_files.js";
import { isIgnored } from "./_conventions.js";
import { bareFileIssues, componentFolderIssues, orphanCssIssues, staleBarrelIssues } from "./_scan-checks.js";
import { buildStats, scanFlat } from "./_scan-flat.js";

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

/** The empty report a missing source directory produces. */
function emptyReport() {
  return {
    pass: true,
    issues: [],
    stats: { totalFiles: 0, totalDirs: 0, missingBarrel: 0, wrongPrefix: 0, bareFiles: 0, fixable: 0 },
  };
}

/**
 * The recursive scanner, kept as the fallback when the code graph is absent.
 *
 * @param {string} target - The source directory to walk
 * @returns {FileTreeReport}
 */
function scanRecursive(target) {
  const issues = [];
  let totalFiles = 0;
  let totalDirectories = 0;

  /** Depth-first walk of one directory. */
  const scan = (currentPath, depth = 0) => {
    let entries;

    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    const directories = entries.filter((entry) => entry.isDirectory());
    const files = entries.filter((entry) => entry.isFile());

    totalDirectories += directories.length;
    totalFiles += files.length;

    const dirName = basename(currentPath);
    const isComponentLike = /^[A-Z]/.test(dirName) && directories.length + files.length > 0;

    if (isComponentLike && depth >= 1) {
      issues.push(...componentFolderIssues(files, currentPath, dirName));
    }

    if (!isComponentLike || depth === 0) {
      issues.push(...bareFileIssues(files, currentPath));
    }

    issues.push(...orphanCssIssues(files, currentPath), ...staleBarrelIssues(files, currentPath));

    for (const dir of directories) {
      if (!isIgnored(dir.name)) {
        scan(join(currentPath, dir.name), depth + 1);
      }
    }
  };

  scan(target);

  return { pass: issues.length === 0, issues, stats: buildStats(issues, totalFiles, totalDirectories) };
}

/**
 * Scan a directory recursively and collect all file tree issues.
 *
 * Prefers the TokenSave `files` listing through the adapter and falls back to
 * the `readdirSync` walk when the graph is absent. The listing is unioned with
 * a live walk, because a file written a moment ago is not in the index and a
 * missed component file is a wrong report.
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

  if (!existsSync(target)) {
    return emptyReport();
  }

  const { files, source } = listFiles(rootDir, { path: srcDir, union: true, ...options });

  return source === "tokensave" ? scanFlat(rootDir, srcDir, files) : scanRecursive(target);
}
