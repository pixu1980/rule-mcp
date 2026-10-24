/**
 * @module cli/setup/entry
 *
 * The flags, and whether this invocation gets the wizard at all.
 *
 * `setup` always comes here: a terminal gets the full-screen wizard, a pipe or
 * a CI job gets the plain runner with the same plan. `install` and `uninstall`
 * come here first and fall back to their own flag path when the answer is no -
 * `--json` on its way to a script, `--no-wizard`, or no terminal to draw in.
 * Every one of those wants a deterministic result, not a redrawn frame.
 *
 * Reading the flags here rather than inside the wizard is what makes `--agent`,
 * `--mode`, `--skills` and their negations mean the same thing on both paths.
 *
 * Each flag is read as a literal string, never assembled from a name: the
 * registry test scans this source for what the CLI reads, and a flag spelled
 * by a template is a flag nothing can prove is documented.
 */

import { canRenderWizard } from "./_options.js";

/**
 * A `--thing` / `--no-thing` pair as true, false, or unanswered.
 *
 * The third state is load-bearing: "the user said no" and "the user said
 * nothing" choose differently once a mode default is in play.
 */
const pick = (on, off) => (on ? true : !off && undefined);

/**
 * Every setup option this invocation asked for.
 *
 * Pure, so the flag semantics the bootstraps document are tested without
 * running an install.
 *
 * @param {"install"|"uninstall"} kind
 * @param {{ getArgument: Function, hasFlag: Function }} io
 * @returns {object}
 */
export function setupOptions(kind, { getArgument, hasFlag }) {
  return {
    uninstall: kind === "uninstall" || hasFlag("--uninstall"),
    agent: getArgument("--agent"),
    mode: getArgument("--mode", "stdio"),
    // The four that narrow the command surface are spelled `--commands-*`
    // because `--skills` is already taken, by the step that copies the skill
    // catalog. One flag with two meanings is a flag nobody can document.
    selection: {
      preset: getArgument("--commands-preset"),
      families: getArgument("--commands-families"),
      areas: getArgument("--commands-areas"),
      skills: getArgument("--commands-skills"),
    },
    rules: pick(hasFlag("--rules"), hasFlag("--no-rules")),
    commands: pick(hasFlag("--commands"), hasFlag("--no-commands")),
    hooks: pick(hasFlag("--hooks"), hasFlag("--no-hooks")),
    skills: pick(hasFlag("--skills"), hasFlag("--no-skills")),
    minimal: pick(hasFlag("--minimal"), hasFlag("--no-minimal")),
    surface: getArgument("--surface"),
    service: pick(hasFlag("--service"), hasFlag("--no-service")),
    doctor: pick(hasFlag("--doctor"), hasFlag("--no-doctor")),
    purge: hasFlag("--purge"),
    keepConfig: hasFlag("--keep-config"),
    force: hasFlag("--force"),
    dryRun: hasFlag("--dry-run"),
    interactive: !(hasFlag("--no-wizard") || hasFlag("--no-interactive") || hasFlag("--json")),
  };
}

/**
 * Run the wizard for this command, or report that it could not.
 *
 * @param {"install"|"uninstall"} kind
 * @param {{ getArgument: Function, hasFlag: Function }} io
 * @returns {Promise<boolean>} whether the wizard handled the command
 */
export async function setupRan(kind, io) {
  const options = setupOptions(kind, io);

  if (!options.interactive || !canRenderWizard()) {
    return false;
  }

  const { runSetup } = await import("./index.js");

  await runSetup(options);

  return true;
}
