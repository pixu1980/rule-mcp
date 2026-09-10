

/** @module core/session/snapshot/project - the whole-project snapshot */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { BARRELS, IGNORED, SOURCE_EXTENSIONS, TEST_PATTERN } from "./_classify.js";
import { directorySize, tokensaveStats } from "./_sizes.js";

/**
 * Count the project.
 *
 * @param {string} projectDir
 * @returns {{
 *   files: { total: number, byExtension: Record<string, number> },
 *   lines: { total: number, byExtension: Record<string, number> },
 *   bytes: { source: number, nodeModules: number, dist: number },
 *   components: number,
 *   adrs: number,
 *   testFiles: number,
 *   tokensave: object,
 * }}
 */
export function snapshotProject(projectDir = process.cwd()) {
  const filesByExtension = {};
  const linesByExtension = {};
  let files = 0;
  let lines = 0;
  let components = 0;
  let adrs = 0;
  let testFiles = 0;
  let sourceBytes = 0;

  const walk = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    // A directory is a component when it holds a barrel, which is the one
    // structural claim this styleguide makes that can be counted rather than
    // argued about.
    if (current !== projectDir && entries.some((entry) => entry.isFile() && BARRELS.has(entry.name))) {
      components += 1;
    }

    const inAdrDirectory = current.endsWith(join("docs", "adr"));

    for (const entry of entries) {
      const full = join(current, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED.has(entry.name)) {
          walk(full);
        }

        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = extname(entry.name).toLowerCase();
      files += 1;
      filesByExtension[extension] = (filesByExtension[extension] ?? 0) + 1;
      try {
        sourceBytes += statSync(full).size;
      } catch {
        /* unreadable, and therefore weightless */
      }

      if (TEST_PATTERN.test(full)) {
        testFiles += 1;
      }

      if (inAdrDirectory && extension === ".md" && /^\d/.test(entry.name)) {
        adrs += 1;
      }

      if (!SOURCE_EXTENSIONS.has(extension)) {
        continue;
      }

      try {
        const text = readFileSync(full, "utf8");
        const count = text.length === 0 ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
        lines += count;
        linesByExtension[extension] = (linesByExtension[extension] ?? 0) + count;
      } catch {
        /* a binary file with a source extension is not a source file */
      }
    }
  };

  walk(projectDir);

  return {
    files: { total: files, byExtension: filesByExtension },
    lines: { total: lines, byExtension: linesByExtension },
    bytes: {
      source: sourceBytes,
      nodeModules: directorySize(join(projectDir, "node_modules")),
      dist: directorySize(join(projectDir, "dist")),
    },
    components,
    adrs,
    testFiles,
    tokensave: tokensaveStats(projectDir),
  };
}
