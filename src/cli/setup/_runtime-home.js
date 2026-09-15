

/**
 * @module cli/setup/runtime-home
 *
 * The runtime home (`~/.rule-mcp/`) and the compiled-code cache: create
 * them on install, report them on uninstall, delete them only when the user
 * asks to purge.
 *
 * A purge removes the whole tree, so a reinstall has to recreate the layout
 * `src/cli/paths/_runtime.js` expects rather than waiting for some later
 * command to lazily do it.
 *
 * The switches file is part of that layout. It is the server's own home for
 * the controls a user sets, the prompt-recording one above all, so an install
 * defaults it here rather than writing a privacy decision into one client's
 * configuration and leaving the other hosts without it (ADR 090).
 */

import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

import { homedir } from "node:os";
import { DEFAULT_OPTOUT_ENV, readEnvConfig, writeEnvConfig } from "../installers/index.js";
import { getRuntimePaths } from "../paths/index.js";

/** Mirrors `cli/installers/_env.js` (not exported there): per-user compile cache. */
const COMPILE_CACHE_DIR = join(homedir(), ".cache", "rule-mcp", "compile-cache");

/** Also `cli/installers/_env.js`: the switches file and the stored model keys. */
const ENV_CONFIG_DIR = join(homedir(), ".config", "rule-mcp");

/** Former `pixGalaxyHome()` - now the rule-mcp runtime root. */
const pixGalaxyHome = () => getRuntimePaths().homeDir;

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
 * Create the runtime home, its subdirectories and the switches file.
 *
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ homeDir: string, dirs: string[], status: "created"|"planned", settings: "written"|"kept"|"planned" }}
 */
export function ensureRuntimeHome({ dryRun = false } = {}) {
  const homeDir = pixGalaxyHome();
  const dirs = SUBDIRS.map((name) => join(homeDir, name));

  if (dryRun) {
    return { homeDir, dirs, status: "planned", settings: "planned" };
  }

  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }
  // Defaults only when there is nothing to keep: a user who has already turned
  // a switch off must not have an install turn it back on.
  const existing = readEnvConfig();
  const settings = Object.keys(existing).length > 0 ? "kept" : "written";

  if (settings === "written") {
    writeEnvConfig(DEFAULT_OPTOUT_ENV);
  }

  return { homeDir, dirs, status: "created", settings };
}

/** What a purge would remove, and how much of it there is. */
export function purgeTargets() {
  return [
    {
      id: "runtime-home",
      label: "Runtime home (state, data, projects, config)",
      dir: pixGalaxyHome(),
    },
    { id: "compile-cache", label: "Compiled-code cache", dir: COMPILE_CACHE_DIR },
    // A purge that took the runtime home and left this behind is what made
    // "purge" a promise the uninstall did not keep: the env switches and any
    // stored model key live here, outside the runtime home.
    { id: "env-config", label: "Config and stored model keys", dir: ENV_CONFIG_DIR },
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
