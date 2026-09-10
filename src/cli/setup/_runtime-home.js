/**
 * @module cli/setup/runtime-home
 *
 * The runtime home (`~/.rule-mcp/`) and the env config directory
 * (`~/.config/rule-mcp/`): create them on install, report them on
 * uninstall, delete them only when the user asks to purge.
 *
 * A purge removes the whole tree, so a reinstall has to recreate the layout
 * `src/cli/paths/_runtime.js` expects rather than waiting for some later
 * command to lazily do it.
 */

import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

import { ENV_CONFIG_DIR } from "../installers/index.js";
import { getRuntimePaths } from "../paths/index.js";

/** Subdirectories the runtime expects to find under the home root. */
const SUBDIRS = ["state", "data", "projects", "config"];

/** Count files under a directory, recursively. Missing directory counts zero. */
export function countFiles(dir) {
  if (!existsSync(dir)) {
    return 0;
  }

  let total = 0;

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    total += statSync(full).isDirectory() ? countFiles(full) : 1;
  }

  return total;
}

/**
 * Create the runtime home and its subdirectories.
 *
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ homeDir: string, dirs: string[], status: "created"|"planned" }}
 */
export function ensureRuntimeHome({ dryRun = false } = {}) {
  const { homeDir } = getRuntimePaths();
  const dirs = SUBDIRS.map((name) => join(homeDir, name));

  if (dryRun) {
    return { homeDir, dirs, status: "planned" };
  }

  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }

  return { homeDir, dirs, status: "created" };
}

/** What a purge would remove, and how much of it there is. */
export function purgeTargets() {
  const { homeDir } = getRuntimePaths();

  return [
    { id: "runtime-home", label: "Runtime home (state, data, projects)", dir: homeDir },
    { id: "env-config", label: "Env config and saved API keys", dir: ENV_CONFIG_DIR },
  ].map((target) => ({ ...target, exists: existsSync(target.dir), files: countFiles(target.dir) }));
}

/**
 * Delete the purge targets that exist.
 *
 * @param {{ dryRun?: boolean, ids?: string[] }} [options]
 * @returns {Array<{ id: string, dir: string, files: number, status: "deleted"|"planned" }>}
 */
export function purgeRuntimeDirs({ dryRun = false, ids } = {}) {
  return purgeTargets()
    .filter((target) => target.exists && (ids === undefined || ids.includes(target.id)))
    .map((target) => {
      if (dryRun) {
        return { id: target.id, dir: target.dir, files: target.files, status: "planned" };
      }

      rmSync(target.dir, { recursive: true, force: true });

      return { id: target.id, dir: target.dir, files: target.files, status: "deleted" };
    });
}
