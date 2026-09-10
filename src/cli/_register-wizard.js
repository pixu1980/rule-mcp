/**
 * Registrar for the `setup` command: the full-screen install/uninstall wizard.
 *
 * Its own file because the option surface is the whole installer contract -
 * every flag the shell bootstraps forward lands here - and the setup
 * registrar has no code in common with the narrower per-agent commands next
 * to it.
 *
 * The handler is imported inside the action, not at the top: the command
 * declaration is what `--help` renders, and a static import would make
 * `--help` pay for React, Ink and the whole agent catalog.
 */
import { Option } from "commander";

/**
 * Register the `setup` command: the full-screen install/uninstall wizard.
 *
 * The boolean pairs are declared positive-first on purpose. Commander makes
 * a lone `--no-x` default `x` to true; declaring `--x` first keeps the
 * option undefined when neither flag is passed, which is what lets the
 * wizard tell "the user said no" apart from "the user said nothing".
 */
export function registerSetupCommand(program) {
  program
    .command("setup")
    .description("Full-screen wizard to install or remove this server across agents")
    .option("--uninstall", "run the removal wizard instead of the install wizard")
    .option("--agent <name>", "limit the run to one agent")
    .addOption(new Option("--mode <name>", "stdio (default), daemon (SSE), or docker").choices(["stdio", "daemon", "sse", "docker"]))
    .option("--rules", "append the instruction block to agent instruction files")
    .option("--no-rules", "skip agent instruction files")
    .option("--commands", "write the rule-* slash commands")
    .option("--no-commands", "skip the rule-* slash commands")
    .option("--skills", "install the bundled rule-* skills to ~/.agents/skills")
    .option("--no-skills", "skip the bundled skills")
    .option("--git-hook", "add the background health check to the post-commit hook")
    .option("--no-git-hook", "skip the git hook")
    .option("--service", "register the platform daemon service (daemon mode)")
    .option("--no-service", "skip the platform daemon service")
    .option("--doctor", "run the health check at the end")
    .option("--no-doctor", "skip the closing health check")
    .option("--purge", "uninstall only: delete ~/.rule-mcp and ~/.config/rule-mcp")
    .option("--keep-config", "uninstall only: keep the config directories even with --purge")
    .option("--force", "override existing configuration")
    .option("--dry-run", "preview without writing")
    .option("--no-interactive", "skip the wizard and run the plan with defaults")
    .allowExcessArguments(false)
    .action(async (options) => {
      await (await import("./setup/index.js")).runSetup(options);
    });
}
