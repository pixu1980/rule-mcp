/**
 * @module cli/register-reinstall
 *
 * The `reinstall` command declaration. The handler is imported inside the
 * action, like every other command: `--help` renders declarations, not work
 * (ADR 074).
 */

/** Register the `reinstall` command. */
export function registerReinstallCommand(program) {
  program
    .command("reinstall")
    .description("Purge node_modules and pnpm-lock.yaml, install again, refresh the global bin")
    .allowExcessArguments(false)
    .action(async () => (await import("./commands/_reinstall.js")).reinstallCommand({}));
}
