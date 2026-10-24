/**
 * @module core/commit/install
 *
 * Installing git governance into a project, idempotently.
 *
 * The rule is one of:
 *
 *   missing     -> install
 *   incomplete  -> integrate
 *   correct     -> preserve
 *
 * The mechanism is detected, never replaced: a project already running Husky
 * keeps Husky, one with a tracked `.githooks/` or a configured `core.hooksPath`
 * keeps that directory, and one with neither and a `package.json` gets Husky
 * because that is the plan's default. A project that is not a Node package gets
 * plain hooks in git's own hooks directory, which is the one mechanism every
 * repository has.
 *
 * @see module:core/commit/detect - what the project already has
 */

import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { detectGovernance, readManifest } from "./_detect.js";
import { DEFAULT_COMMAND, writeHook } from "./_hook.js";
import { installHusky, prepareScriptState } from "./_husky.js";

/** The hooks this installer owns. */
const HOOK_NAMES = ["commit-msg", "pre-push"];

/**
 * The default runner: a package-manager command that must not fail the init.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {object} options
 */
export function defaultRun(command, args, options) {
  execFileSync(command, args, { stdio: "ignore", ...options });
}

/**
 * Install git governance, or bring an incomplete one up to date.
 *
 * @param {string} projectDir
 * @param {{ command?: string, run?: (command: string, args: string[], options: object) => void, husky?: boolean }} [options]
 *   `run` is injectable so the Husky install is testable without a registry.
 *   `husky: false` skips installing it and writes plain hooks instead.
 * @returns {import("./_detect.js").Governance & { hooks: Record<string, string>, prepare: string, actions: string[] }}
 */
export function installGitGovernance(projectDir, options = {}) {
  const detected = detectGovernance(projectDir);

  if (detected.mechanism === "none") {
    return { ...detected, hooks: {}, prepare: "missing", actions: ["skipped: not a git repository"] };
  }

  const command = options.command ?? DEFAULT_COMMAND;
  const run = options.run ?? defaultRun;
  const actions = [];
  let { mechanism, hooksDir } = detected;

  if (!hooksDir) {
    return { ...detected, hooks: {}, prepare: prepareScriptState(projectDir), actions: ["skipped: no hooks directory"] };
  }

  // A Node project with no governance yet gets Husky, the plan's default.
  if (mechanism === "git" && detected.packageManager && options.husky !== false) {
    if (!detected.husky && !readManifest(projectDir)?.devDependencies?.husky) {
      actions.push(...installHusky(projectDir, { manager: detected.packageManager, run }));
    }

    mechanism = "husky";
    hooksDir = join(projectDir, ".husky");
  }

  const hooks = {};

  for (const name of HOOK_NAMES) {
    hooks[name] = writeHook(hooksDir, name, { command });
  }

  return { ...detected, mechanism, hooksDir, hooks, prepare: prepareScriptState(projectDir), actions };
}
