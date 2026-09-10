/**
 * @module cli/setup/options
 *
 * Turning command-line options into wizard defaults.
 *
 * Pure, so the flag semantics the shell installers documented can be tested
 * without running an install. The tri-state flags matter: `--skills` and
 * `--no-skills` are not the same as saying nothing, which is why the option
 * is `undefined` rather than `false` when it is absent.
 */

import { normalizeInstallMode } from "../installers/index.js";

/** Optional steps that run unless the caller opts out. */
export const DEFAULT_EXTRAS = ["rules", "commands", "doctor"];

/** Whether this process can host a full-screen wizard. */
export function canRenderWizard(env = process.env, stdin = process.stdin, stdout = process.stdout) {
  return Boolean(stdin.isTTY && stdout.isTTY) && !env.CI && env.TERM !== "dumb";
}

/**
 * Which optional steps a non-interactive run should perform.
 *
 * @param {{ rules?: boolean, commands?: boolean, skills?: boolean, gitHook?: boolean, service?: boolean, doctor?: boolean, mode?: string }} options
 */
export function resolveExtras(options = {}) {
  const extras = new Set(DEFAULT_EXTRAS);
  const toggle = (id, value) => {
    if (value === true) {
      extras.add(id);
    } else if (value === false) {
      extras.delete(id);
    }
  };

  toggle("rules", options.rules);
  toggle("commands", options.commands);
  toggle("skills", options.skills);
  toggle("gitHook", options.gitHook);
  toggle("doctor", options.doctor);
  // The platform service belongs to daemon mode and is on by default there.
  toggle("service", options.service ?? options.mode === "daemon");

  return [...extras];
}

/**
 * Normalize every flag into the shape the apps and the plain runner expect.
 *
 * @param {object} options
 * @returns {{ mode: string, agents: string[]|null, extras: string[], dryRun: boolean, force: boolean, purge: boolean, keepConfig: boolean, interactive: boolean }}
 */
export function resolveSetupOptions(options = {}) {
  const mode = normalizeInstallMode(options.mode ?? "stdio");

  return {
    mode,
    // `--agent <name>` narrows the run to one target; absent means "whatever
    // detection found", which the caller resolves.
    agents: options.agent && options.agent !== "all" ? [options.agent] : null,
    extras: resolveExtras({ ...options, mode }),
    dryRun: Boolean(options.dryRun),
    force: Boolean(options.force),
    purge: Boolean(options.purge),
    keepConfig: Boolean(options.keepConfig),
    interactive: options.interactive !== false && canRenderWizard(),
  };
}
