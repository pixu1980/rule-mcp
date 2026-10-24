/**
 * @module core/file-tree/scan-flat
 *
 * The flat-list scanner: the same checks as `./_scan.js`, applied to a
 * project-relative file list instead of a `readdirSync` recursion.
 *
 * It exists because TokenSave answers with a flat list of paths, and the
 * directory structure has to be rebuilt from it. The report shape and the
 * stats are identical to the recursive scanner, which is what lets
 * `scanFileTree` switch sources without changing the output.
 */

import { basename, dirname, join } from "node:path";

import { isIgnored } from "./_conventions.js";
import { bareFileIssues, componentFolderIssues, orphanCssIssues, staleBarrelIssues } from "./_scan-checks.js";

/**
 * Summarize a scan: totals plus the per-type counts the report carries.
 *
 * @param {import("./_conventions.js").FileTreeIssue[]} issues
 * @param {number} totalFiles
 * @param {number} totalDirectories
 * @returns {{ totalFiles: number, totalDirs: number, missingBarrel: number, wrongPrefix: number, bareFiles: number, fixable: number }}
 */
export function buildStats(issues, totalFiles, totalDirectories) {
  return {
    totalFiles,
    totalDirs: totalDirectories,
    missingBarrel: issues.filter((entry) => entry.type === "missing-barrel").length,
    wrongPrefix: issues.filter((entry) => entry.type === "wrong-prefix").length,
    bareFiles: issues.filter((entry) => entry.type === "bare-file").length,
    fixable: issues.filter((entry) => entry.fixable).length,
  };
}

/** The directory a project-relative path belongs to, relative to `srcDir`. */
function dirWithin(rel, prefix) {
  const within = rel.slice(prefix.length);
  const dir = dirname(within);

  return dir === "." ? "" : dir;
}

/**
 * Scan a project from a flat, project-relative file list.
 *
 * @param {string} rootDir - Project root
 * @param {string} srcDir - Source directory
 * @param {string[]} files - Project-relative file paths
 * @returns {import("./_scan.js").FileTreeReport}
 */
export function scanFlat(rootDir, srcDir, files) {
  const prefix = srcDir.endsWith("/") ? srcDir : `${srcDir}/`;
  const byDir = new Map();
  const dirs = new Set([""]);

  for (const rel of files) {
    if (!rel.startsWith(prefix)) {
      continue;
    }

    const inDir = dirWithin(rel, prefix);

    let dir = inDir;

    while (dir !== "" && !dirs.has(dir)) {
      dirs.add(dir);
      const parent = dirname(dir);
      dir = parent === "." ? "" : parent;
    }

    const list = byDir.get(inDir) ?? [];

    list.push(basename(rel));
    byDir.set(inDir, list);
  }

  const children = new Map();

  for (const dir of dirs) {
    if (dir === "") {
      continue;
    }

    const parent = dirname(dir);
    const key = parent === "." ? "" : parent;

    children.set(key, [...(children.get(key) ?? []), basename(dir)]);
  }

  const issues = [];
  let totalFiles = 0;
  let totalDirectories = 0;

  /** Mirror the recursive scanner's per-directory checks. */
  const walk = (dir, depth) => {
    const fileNames = byDir.get(dir) ?? [];
    const childDirs = [...(children.get(dir) ?? [])].sort((a, b) => a.localeCompare(b));
    const currentPath = join(rootDir, srcDir, dir);
    const dirFiles = fileNames.map((name) => ({ name }));
    const childEntries = childDirs.map((name) => ({ name }));

    totalDirectories += childEntries.length;
    totalFiles += dirFiles.length;

    const dirName = basename(currentPath);
    const isComponentLike = /^[A-Z]/.test(dirName) && childEntries.length + dirFiles.length > 0;

    if (isComponentLike && depth >= 1) {
      issues.push(...componentFolderIssues(dirFiles, currentPath, dirName));
    }

    if (!isComponentLike || depth === 0) {
      issues.push(...bareFileIssues(dirFiles, currentPath));
    }

    issues.push(...orphanCssIssues(dirFiles, currentPath), ...staleBarrelIssues(dirFiles, currentPath));

    for (const child of childDirs) {
      if (!isIgnored(child)) {
        walk(join(dir, child), depth + 1);
      }
    }
  };

  walk("", 0);

  return { pass: issues.length === 0, issues, stats: buildStats(issues, totalFiles, totalDirectories) };
}
