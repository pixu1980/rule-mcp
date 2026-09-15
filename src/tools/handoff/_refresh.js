

/**
 * @module tools/handoff/refresh
 *
 * Regenerate a project's `HANDOFF.md` from the current project state.
 *
 * The handoff tool answers text; a project that keeps that text in a file
 * (`HANDOFF.md`) has to refresh it when the ADR numbering moves, or the file
 * quotes numbers that no longer exist. Only a file that is already there is
 * rewritten - the refresher never creates one.
 */

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildHandoff } from "./_build.js";

/** The file name a project may keep its handoff in. */
export const HANDOFF_FILE = "HANDOFF.md";

/**
 * Rewrite `HANDOFF.md` when it exists, and return its path; null otherwise.
 *
 * @param {string} [projectDir]
 * @param {{ build?: Function }} [options] - injected builder for tests
 * @returns {string|null}
 */
export function regenerateHandoffFile(projectDir = ".", { build = buildHandoff } = {}) {
  const file = join(projectDir, HANDOFF_FILE);

  if (!existsSync(file)) {
    return null;
  }

  const built = build({ projectDir, mode: "handoff", format: "full", maxTokens: 0 });

  writeFileSync(file, built.text);

  return file;
}
