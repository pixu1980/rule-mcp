/** List the handoff documents a project carries. */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { HANDOFF_DIR } from "./_constants.js";

/**
 * The handoff files in a project, newest number first.
 *
 * @param {string} projectDir
 * @returns {string[]} paths relative to the project root
 */
export function listHandoffs(projectDir) {
  const dir = join(projectDir, HANDOFF_DIR);

  if (!existsSync(dir)) {
    return [];
  }

  try {
    return readdirSync(dir)
      .filter((name) => /^\d{2,4}-.+\.md$/.test(name))
      .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10))
      .map((name) => `${HANDOFF_DIR}/${name}`);
  } catch {
    return [];
  }
}
