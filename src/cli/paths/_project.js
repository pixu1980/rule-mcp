/** @module cli/paths/project - the per-project recording directory and its slug */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { getRuntimePaths } from "./_runtime.js";

/**
 * Walk up looking for a repository root. Falls back to the starting directory,
 * which is the right answer for a project that is not under version control.
 *
 * @param {string} from
 * @returns {string}
 */
export function findProjectRoot(from) {
  let current = resolve(from);

  for (;;) {
    try {
      if (existsSync(join(current, ".git"))) {
        return current;
      }
    } catch {
      /* an unreadable directory is not a root */
    }

    const parent = dirname(current);

    if (parent === current) {
      return resolve(from);
    }

    current = parent;
  }
}

/**
 * The directory name a project's recording is filed under.
 *
 * Half of it is the project's own name, so a person looking at the projects
 * root can tell what they are looking at, and half is a digest of the absolute
 * path, so two checkouts of the same repository are two recordings. Moving a
 * checkout starts a new one, which is the honest answer: the recording
 * describes a directory, and that directory is gone.
 *
 * @param {string} projectDir - absolute path to the project root
 * @returns {string}
 */
export function projectSlug(projectDir) {
  const name =
    basename(projectDir)
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]+/g, "-")
      .replaceAll(/^-+|-+$/g, "") || "project";
  const digest = createHash("sha256").update(projectDir).digest("hex").slice(0, 8);

  return `${name}-${digest}`;
}

/**
 * Where this server keeps what it learned about ONE project.
 *
 * Telemetry, the exported flights and the project id are facts about a
 * repository, not about a machine: a cache hit rate averaged over every project
 * on the disk answers nothing, and a benchmark export belongs next to the code
 * it benchmarked. The daemon's pid, its log and the result cache stay in the
 * state directory, because a single daemon serves every project at once.
 *
 * The root is the repository root when there is one, so a call made from a
 * subdirectory records into the same place as one made from the top.
 *
 * @param {string} [cwd]
 * @returns {{ projectDir: string, dir: string, exportsDir: string }}
 */
export function getProjectPaths(cwd = process.cwd()) {
  const projectDir = findProjectRoot(cwd);
  const dir = join(projectsRoot(), projectSlug(projectDir));

  return { projectDir, dir, exportsDir: join(dir, "exports") };
}

/**
 * Where every project's recording is kept.
 *
 * RULE_MCP_STATE_DIR relocates mutable state, and a recording is mutable
 * state: honoring it here is what keeps a test suite, or a container, out of the
 * real home directory. Without that, a suite that pointed the state directory at
 * a temporary path still wrote its project into the home.
 *
 * @returns {string}
 */
export function projectsRoot() {
  return join(getRuntimePaths().homeDir, "projects");
}
