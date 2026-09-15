

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

import { MINIMAL_ENV_VAR, normalizeInstallMode } from "../installers/index.js";
import { selectionOf } from "../install/_selection-flags.js";
import { surfaceOf } from "../install/_surface-flags.js";

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
export const majorOf = (version = process.version) => Number.parseInt(String(version).replace(/^v/, "").split(".", 1)[0], 10);

/**
 * Whether this process can host a full-screen wizard.
 *
 * Four reasons it cannot, and each one is a real install someone runs: a node
 * older than the renderer, a pipe on either end, a CI job, and a terminal that
 * declares itself dumb.
 *
 * @param {object} [env] @param {object} [stdin] @param {object} [stdout] @param {string} [version]
 */
export function canRenderWizard(env = process.env, stdin = process.stdin, stdout = process.stdout, version = process.version) {
  if (majorOf(version) < WIZARD_NODE_MIN) {
    return false;
  }

  return Boolean(stdin.isTTY && stdout.isTTY) && !env.CI && env.TERM !== "dumb";
}

/** Why the wizard is not drawing, when the reason is the runtime. */
export const wizardRuntimeNote = () =>
  majorOf() < WIZARD_NODE_MIN ? `${process.version} cannot host the wizard (node ${WIZARD_NODE_MIN} or newer draws it) - running the same plan from the flags.` : "";

/**
 * Carry a `--minimal` / `--no-minimal` answer into the process environment.
 *
 * The written server config mirrors the ambient value (see
 * `cli/installers/_env.js`), so the flag only has to arrive before the plan
 * runs. Absent touches nothing: neither a saved preference nor an ambient
 * value is created or clobbered by saying nothing.
 *
 * @param {boolean|undefined} minimal
 * @param {object} [env]
 */
export function applyMinimalEnv(minimal, env = process.env) {
  if (minimal === true) {
    env[MINIMAL_ENV_VAR] = "1";
  } else if (minimal === false) {
    env[MINIMAL_ENV_VAR] = "0";
  }
}

/**
 * Which optional steps a non-interactive run should perform.
 *
 * @param {{ rules?: boolean, commands?: boolean, hooks?: boolean, skills?: boolean, service?: boolean, doctor?: boolean, minimal?: boolean, mode?: string }} options
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
  // Minimal is not a step that runs, but the Extras screen is where the
  // wizard asks it, so the flag pre-checks that row the same way.
  toggle("minimal", options.minimal);
  // The platform service belongs to daemon mode and is on by default there.
  toggle("service", options.service ?? options.mode === "daemon");

  return [...extras];
}

/**
 * Normalize every flag into the shape the apps and the plain runner expect.
 *
 * @param {object} options
 * @returns {{ mode: string, agents: string[]|null, extras: string[], selection: object|null, minimal: boolean|undefined, surface: object|null, dryRun: boolean, force: boolean, purge: boolean, keepConfig: boolean, interactive: boolean }}
 */
export function resolveSetupOptions(options = {}) {
  const mode = normalizeInstallMode(options.mode ?? "stdio");

  return {
    mode,
    // `--minimal` / `--no-minimal` choose the installed server surface;
    // absent leaves the saved config alone (see `applyMinimalEnv`).
    minimal: options.minimal,
    // The Surface step answers apart from the command files; absent leaves
    // the saved server config alone (see `applySurfaceEnv`). A flag arrives
    // as its spec string, the wizard as its answer: both normalize to one.
    surface: typeof options.surface === "string" ? surfaceOf({ surface: options.surface }) : (options.surface ?? null),
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
