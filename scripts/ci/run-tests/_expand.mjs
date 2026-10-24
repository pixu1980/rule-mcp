/** @module scripts/ci/run-tests/expand - a suite's globs to the files one node --test run gets */
import { globSync, existsSync } from "node:fs";

import { SUITES } from "./_suites.data.mjs";

/**
 * A suite plus every suite it includes, merged, each visited once.
 *
 * @param {string} id
 * @param {Record<string, object>} [suites]
 * @param {Set<string>} [seen]
 * @returns {{ steps: string[], globs: string[], shell: unknown[], exclude: string[] }}
 */
export function resolveSuite(id, suites = SUITES, seen = new Set()) {
  const empty = { steps: [], globs: [], shell: [], exclude: [] };

  if (seen.has(id)) {
    // A suite that includes itself, directly or in a cycle, contributes once.
    return empty;
  }

  seen.add(id);

  const suite = suites[id] ?? {};
  const merged = {
    steps: [...(suite.steps ?? [])],
    globs: [...(suite.globs ?? [])],
    shell: [...(suite.shell ?? [])],
    exclude: [...(suite.exclude ?? [])],
  };

  for (const included of suite.include ?? []) {
    const sub = resolveSuite(included, suites, seen);

    merged.steps.push(...sub.steps);
    merged.globs.push(...sub.globs);
    merged.shell.push(...sub.shell);
    merged.exclude.push(...sub.exclude);
  }

  return merged;
}

/**
 * The files a suite hands to `node --test`, and the exclusions that name a
 * file which is not there: an exclusion states whose runner a file is, so one
 * that names nothing is a rename nobody followed.
 *
 * @param {string} id
 * @param {Record<string, object>} [suites]
 * @returns {{ files: string[], absent: string[] }}
 */
export function expandSuite(id, suites = SUITES) {
  const { globs, exclude } = resolveSuite(id, suites);
  const matched = [...new Set(globs.flatMap((pattern) => globSync(pattern)))].sort();
  const excluded = new Set(exclude);

  return {
    files: matched.filter((file) => !excluded.has(file)),
    absent: [...excluded].filter((file) => !existsSync(file)),
  };
}
