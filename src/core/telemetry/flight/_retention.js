/** @module core/telemetry/flight/retention */

import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { getProjectPaths } from "../../../cli/paths/index.js";

/** Exports kept regardless of age, and the age window kept regardless of count. */
const EXPORT_KEEP = 10;
const EXPORT_MAX_AGE_DAYS = 90;

/**
 * Apply retention to exports/ (hardening 2.2, finding F-P1).
 *
 * Raw events are purged after 7 days; an exported .flight carries the whole
 * recording - prompt text included - and had no expiry at all. The rule keeps
 * whichever is larger, the newest `keep` files or everything inside the age
 * window, and never removes the newest file: a policy that eats the export
 * somebody just made would be a bug.
 *
 * @param {{ dir?: string, projectDir?: string, keep?: number, maxAgeDays?: number, now?: number }} [options]
 * @returns {{ dir: string, removed: number, kept: number }}
 */
export function pruneExports(options = {}) {
  const dir = options.dir ?? getProjectPaths(options.projectDir ?? process.cwd()).exportsDir;
  const keep = options.keep ?? EXPORT_KEEP;
  const cutoff = (options.now ?? Date.now()) - (options.maxAgeDays ?? EXPORT_MAX_AGE_DAYS) * 86_400_000;

  let entries;
  try {
    entries = readdirSync(dir)
      .filter((name) => name.endsWith(".flight"))
      .map((name) => {
        const file = join(dir, name);

        return { file, mtime: statSync(file).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return { dir, removed: 0, kept: 0 };
  }

  let removed = 0;
  // Index 0 is the newest and is never a candidate, whatever the caps say.
  for (const [index, entry] of entries.entries()) {
    if (index === 0 || index < keep || entry.mtime >= cutoff) {
      continue;
    }

    try {
      rmSync(entry.file, { force: true });
      removed += 1;
    } catch {
      /* a file that cannot be removed stays, and the next run tries again */
    }
  }

  return { dir, removed, kept: entries.length - removed };
}
