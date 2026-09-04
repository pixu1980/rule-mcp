/**
 * @module core/project-snapshot
 *
 * What the project looked like when the recording ended.
 *
 * Half of any honest benchmark of this server is not about the server at all:
 * it is about what came out the other end. Lines written, components created,
 * ADRs recorded, tests present, and how much of the repository is dependencies
 * rather than work. The hand-written reports gathered these with `find`, `wc`
 * and `du`; doing it here makes them part of the export instead of part of
 * somebody's afternoon.
 *
 * Everything is measured, nothing is scored. "Did the model follow the
 * styleguide" is a judgment and stays out; "how many directories have a barrel
 * file" is a count and stays in.
 *
 * @see module:core/telemetry-flight - what puts this in the export
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

/** Directories that are never source, however large they are. */
const IGNORED = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  ".cache",
  ".tokensave",
  ".venv",
  "venv",
  "__pycache__",
]);

/** Extensions counted as source text. Anything else is weighed but not read. */
const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
  ".astro",
  ".css",
  ".scss",
  ".html",
  ".json",
  ".md",
  ".yaml",
  ".yml",
  ".sh",
  ".py",
  ".rs",
  ".go",
]);

/** Files whose names say they are tests. */
const TEST_PATTERN = /(\.test\.|\.spec\.|__tests__)/;

/** A barrel is what turns a directory into a component in this styleguide. */
const BARRELS = new Set(["index.js", "index.jsx", "index.ts", "index.tsx", "index.mjs"]);

/**
 * Recursive size of a directory in bytes. Returns 0 for one that is not there,
 * which is the right answer for `node_modules` in a project nobody installed.
 *
 * @param {string} dir
 * @returns {number}
 */
export function directorySize(dir) {
  let total = 0;
  const walk = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(current, entry.name);
      try {
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          total += statSync(full).size;
        }
      } catch {
        /* a file that vanished mid-walk weighs nothing */
      }
    }
  };
  if (existsSync(dir)) {
    walk(dir);
  }

  return total;
}

/**
 * Read the tokensave graph's own counters.
 *
 * Reported as `present: false` rather than as zeros when there is no graph: a
 * project with no code graph and a project with an empty one are different
 * facts, and only one of them is a finding.
 *
 * @param {string} projectDir
 * @returns {{ present: boolean, dbBytes?: number, dbFile?: string }}
 */
export function tokensaveStats(projectDir) {
  const dir = join(projectDir, ".tokensave");

  if (!existsSync(dir)) {
    return { present: false };
  }

  const meta = join(dir, "branch-meta.json");
  let dbFile = "tokensave.db";
  try {
    if (existsSync(meta)) {
      dbFile = JSON.parse(readFileSync(meta, "utf8")).db_file || dbFile;
    }
  } catch {
    /* an unreadable meta file leaves the default name */
  }

  const db = join(dir, dbFile);

  return {
    present: true,
    dbFile,
    dbBytes: (() => {
      try {
        return existsSync(db) ? statSync(db).size : 0;
      } catch {
        return 0;
      }
    })(),
  };
}

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
