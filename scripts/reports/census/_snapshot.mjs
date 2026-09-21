

/**
 * @module scripts/reports/census/snapshot
 *
 * The checked-in snapshot the census test reads, and the shape it holds.
 *
 * The generator reaches 551 source files, so a test that imported it to compare
 * bytes loaded the whole application - and every leaf edit in `src/` was in a
 * documentation test's dependency chain. The snapshot is what the test reads
 * instead: the files the census owns and the digest of what it wrote into each.
 * Freshness against the live code stays `--check`'s job, and CI runs it.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT } from "./_registries.mjs";

/** Where the snapshot lives, inside the fixtures a test may read. */
export const SNAPSHOT = join(ROOT, "tests", "fixtures", "census.json");

/**
 * The snapshot as it sits on disk, or "" when it is not there yet: a missing
 * snapshot is a stale one, never a crash.
 *
 * @returns {string}
 */
export function readSnapshot() {
  try {
    return readFileSync(SNAPSHOT, "utf8");
  } catch {
    return "";
  }
}

/**
 * The snapshot's content: one entry per owned file, sorted and stamped with no
 * clock, so a run that changes nothing leaves the file byte-identical.
 *
 * @param {Array<{file: string, kind: string, marker?: string, content: string}>} outputs
 * @returns {string}
 */
export function snapshotText(outputs) {
  const files = outputs
    .map((output) => ({
      file: output.file,
      kind: output.kind,
      ...(output.marker ? { marker: output.marker } : {}),
      sha256: createHash("sha256").update(output.content).digest("hex"),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));

  return `${JSON.stringify({ version: 1, files }, null, 2)}\n`;
}
