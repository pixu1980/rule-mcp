/** @module cli/register-agent-commands - the agent slash-command registrar */

import { Option } from "commander";

const PRESET_HELP = "minimal, standard or full";

/** Register the `agent-commands` command. */
export function registerAgentCommandsCommand(program) {
  program
    .command("agent-commands")
    .description("Registry-driven agent slash-command management")
    .option("--dir <path>", "write commands to this directory")
    .option("--format <f>", "args (default), workflow, gemini, prompt, plain")
    .option("--list", "list command names")
    .option("--targets", "print resolved target directories")
    .option("--sync", "write to EVERY detected agent dir")
    .option("--remove", "remove instead of writing")
    .option("--force", "overwrite existing files")
    .option("--dry-run", "preview without writing")
    .option("--agent <name>", "limit to these agents (comma-separated)")
    .addOption(new Option("--preset <name>", PRESET_HELP).choices(["minimal", "standard", "full"]))
    .option("--families <list>", "comma-separated: areas, personas, tasks")
    .option("--areas <list>", "comma-separated area names, e.g. frontend,data")
    .option("--skills <list>", "comma-separated skill names")
    .allowExcessArguments(false)
    .action(async (options) => {
      const { selectionFrom } = await import("./install/_selection-flags.js");

      (await import("./commands/_targets.js")).agentCommandsCommand({
        dir: options.dir,
        format: options.format,
        list: options.list,
        targets: options.targets,
        sync: options.sync,
        remove: options.remove,
        force: options.force,
        dryRun: options.dryRun,
        agent: options.agent,
        only: selectionFrom(options),
      });
    });
}
