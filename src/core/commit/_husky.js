/**
 * @module core/commit/husky
 *
 * Installing and activating Husky with the package manager the project already
 * uses. The manager is never guessed: the lockfile decides, and a project with
 * no lockfile keeps npm, the default every manager understands.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The `add a dev dependency` arguments for each manager. */
const ADD_ARGS = {
  pnpm: ["add", "-D", "husky"],
  npm: ["install", "-D", "husky"],
  yarn: ["add", "-D", "husky"],
  bun: ["add", "-d", "husky"],
};

/** The `run a local binary` arguments for each manager. */
const EXEC_ARGS = {
  pnpm: ["exec", "husky"],
  npm: ["exec", "--", "husky"],
  yarn: ["exec", "husky"],
  bun: ["x", "husky"],
};

/**
 * The manager's dev-dependency arguments.
 *
 * @param {string} manager
 * @returns {string[]}
 */
export function huskyAddArgs(manager) {
  return ADD_ARGS[manager] ?? ADD_ARGS.npm;
}

/**
 * The manager's local-binary arguments.
 *
 * @param {string} manager
 * @returns {string[]}
 */
export function huskyExecArgs(manager) {
  return EXEC_ARGS[manager] ?? EXEC_ARGS.npm;
}

/**
 * What the project already says about its `prepare` script.
 *
 * @param {string} projectDir
 * @returns {"missing"|"husky"|"other"|"absent"}
 */
export function prepareScriptState(projectDir) {
  let manifest;

  try {
    manifest = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"));
  } catch {
    return "missing";
  }

  const prepare = manifest.scripts?.prepare;

  if (!prepare) {
    return "absent";
  }

  return prepare.includes("husky") ? "husky" : "other";
}

/**
 * Add `"prepare": "husky"` when no `prepare` script exists.
 *
 * An existing script is preserved: it may already run husky, or it may be doing
 * something else the project needs.
 *
 * @param {string} projectDir
 * @returns {boolean} true when the script was added
 */
export function ensurePrepareScript(projectDir) {
  const path = join(projectDir, "package.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));

  if (manifest.scripts?.prepare) {
    return false;
  }

  manifest.scripts = { ...manifest.scripts, prepare: "husky" };
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);

  return true;
}

/**
 * Install Husky and activate it, through the project's own package manager.
 *
 * @param {string} projectDir
 * @param {{ manager: string, run: (command: string, args: string[], options: object) => void }} options
 * @returns {string[]} what was done, one action per line
 */
export function installHusky(projectDir, { manager, run }) {
  const actions = [];

  run(manager, huskyAddArgs(manager), { cwd: projectDir });
  actions.push(`husky: installed as a dev dependency (${manager})`);

  if (ensurePrepareScript(projectDir)) {
    actions.push("husky: prepare script added");
  }

  run(manager, huskyExecArgs(manager), { cwd: projectDir });
  actions.push("husky: initialized");

  return actions;
}
