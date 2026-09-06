/** @module core/session/snapshot/sizes - directory weights and the tokensave stats */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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
