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
import { selectionOf } from "../install/_selection-flags.js";

/** Optional steps that run unless the caller opts out. */
export const DEFAULT_EXTRAS = ["rules", "commands", "hooks", "doctor"];

/**
 * The node the renderer needs, which is higher than the one the server needs.
 *
 * Ink 7 declares `engines: node >= 22`; the package floor is 20, and a node 20
 * install still has to work. It gets the plain runner - the same plan, printed
 * rather than drawn - so the floor costs a frame and not an install.
 */
export const WIZARD_NODE_MIN = 22;

/** The major of a version string, `v24.1.0` or `24.1.0` alike. */
export const majorOf = (version = process.version) =>
  Number.parseInt(String(version).replace(/^v/, "").split(".", 1)[0], 10);

/**
 * Whether this process can host a full-screen wizard.
 *
 * Four reasons it cannot, and each one is a real install someone runs: a node
 * older than the renderer, a pipe on either end, a CI job, and a terminal that
 * declares itself dumb.
 *
 * @param {object} [env] @param {object} [stdin] @param {object} [stdout] @param {string} [version]
 */
export function canRenderWizard(
  env = process.env,
  stdin = process.stdin,
  stdout = process.stdout,
  version = process.version,
) {
  if (majorOf(version) < WIZARD_NODE_MIN) {
    return false;
  }

  return Boolean(stdin.isTTY && stdout.isTTY) && !env.CI && env.TERM !== "dumb";
}

/** Why the wizard is not drawing, when the reason is the runtime. */
export const wizardRuntimeNote = () =>
  majorOf() < WIZARD_NODE_MIN
    ? `${process.version} cannot host the wizard (node ${WIZARD_NODE_MIN} or newer draws it) - running the same plan from the flags.`
    : "";

/**
 * Which optional steps a non-interactive run should perform.
 *
 * @param {{ rules?: boolean, commands?: boolean, hooks?: boolean, skills?: boolean, service?: boolean, doctor?: boolean, mode?: string }} options
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
  toggle("hooks", options.hooks);
  toggle("skills", options.skills);
  toggle("doctor", options.doctor);
  // The platform service belongs to daemon mode and is on by default there.
  toggle("service", options.service ?? options.mode === "daemon");

  return [...extras];
}

/**
 * Normalize every flag into the shape the apps and the plain runner expect.
 *
 * @param {object} options
 * @returns {{ mode: string, agents: string[]|null, extras: string[], selection: object|null, dryRun: boolean, force: boolean, purge: boolean, keepConfig: boolean, interactive: boolean }}
 */
export function resolveSetupOptions(options = {}) {
  const mode = normalizeInstallMode(options.mode ?? "stdio");

  return {
    mode,
    // `--agent <name>` narrows the run to one target; absent means "whatever
    // detection found", which the caller resolves.
    agents: options.agent && options.agent !== "all" ? [options.agent] : null,
    extras: resolveExtras({ ...options, mode }),
    // Null means no flag narrowed the command surface, which the plan reads as
    // "every command" - what an install wrote before the surface grew one per
    // skill. The wizard replaces it with whatever its commands step answered.
    selection: selectionOf(options.selection ?? {}),
    dryRun: Boolean(options.dryRun),
    force: Boolean(options.force),
    purge: Boolean(options.purge),
    keepConfig: Boolean(options.keepConfig),
    interactive: options.interactive !== false && canRenderWizard(),
  };
}
