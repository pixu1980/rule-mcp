/**
 * @module scripts/fix/tracked - the file list every fixer starts from
 *
 * Both fixers asked git the same question in the same way, and each carried
 * its own `execFileSync("git", ...)` to ask it. The question is the shared
 * part; what each does with the answer is not, so only the question moved
 * here (SIMP-3, SIMP-4).
 *
 * `--others --exclude-standard` is load-bearing: without it a brand new file
 * is invisible to the pass, and three batches of new skills once scanned
 * clean while still untracked.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Tracked and untracked files matching `patterns`, minus what the caller skips.
 *
 * @param {string[]} patterns - git pathspecs, e.g. ["src/**\/*.js"]
 * @param {{ skip?: RegExp[], prefixes?: string[] }} [options]
 *   `skip`: paths the pass must never touch. `prefixes`: limit to these path
 *   prefixes (empty means no limit).
 * @returns {string[]} paths that exist on disk right now
 */
export function trackedFiles(patterns, { skip = [], prefixes = [] } = {}) {
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", ...patterns], { encoding: "utf8" })
    .trim()
    .split("\n");

  return (
    listed
      .filter(Boolean)
      .filter((file) => !skip.some((pattern) => pattern.test(file)))
      .filter((file) => prefixes.length === 0 || prefixes.some((prefix) => file.startsWith(prefix)))
      // git lists a deleted-but-still-tracked file; reading it would crash the pass.
      .filter((file) => existsSync(file))
  );
}
