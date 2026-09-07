/** Setup command registrars: install, uninstall, config, doctor, completions, agent-commands. */
import { agentCommandsCommand, completionsCommand, configCommand, configureCommand, doctorCommand, installCommand, uninstallCommand } from "./commands/index.js";
import { Option } from "commander";

/** Collector for repeatable options: `--set A=1 --set B=2` → ["A=1", "B=2"]. */
const collect = (value, previous) => [...previous, value];

/** Register the `install` command. */
export function registerInstallCommand(program) {
  program
    .command("install")
    .description("Install rule-mcp into an agent/IDE (edits mcp.json)")
    .option("--agent <name>", "target agent, or 'all' for every supported agent", "all")
    .addOption(new Option("--mode <name>", "stdio (default), daemon (SSE), or docker").choices(["stdio", "daemon", "sse", "docker"]))
    .option("--global", "use clean command path (requires global install)")
    .option("--force", "override existing configuration")
    .option("--dry-run", "preview without writing")
    .option("--json", "print machine-readable JSON instead of Terminal UI")
    .allowExcessArguments(false)
    .action((options) => {
      installCommand({
        agent: options.agent,
        mode: options.mode ?? "stdio",
        global: options.global,
        force: options.force,
        dryRun: options.dryRun,
        json: options.json,
      });
    });
}

/** Register the `uninstall` command. */
export function registerUninstallCommand(program) {
  program
    .command("uninstall")
    .description("Remove rule-mcp from an agent/IDE")
    .option("--agent <name>", "target agent, or 'all' for every configured agent", "all")
    .option("--dry-run", "preview without removing")
    .option("--json", "print machine-readable JSON instead of Terminal UI")
    .allowExcessArguments(false)
    .action((options) => {
      uninstallCommand({ agent: options.agent, dryRun: options.dryRun, json: options.json });
    });
}

/** Register the `config` command. */
export function registerConfigCommand(program) {
  program
    .command("config")
    .description("Print the mcp.json snippet, or manage RULE_MCP_* env vars with `config env`")
    .argument("[section]", "env to configure RULE_MCP_* variables (default: print mcp.json snippet)")
    .option("--global", "use clean command path (requires global install)")
    .option("--mode <name>", "stdio (default), daemon (SSE), or docker")
    .option("--set <pair>", "KEY=VALUE to save (repeatable)", collect, [])
    .option("--list", "list saved RULE_MCP_* env vars")
    .option("--unset <key>", "remove a saved RULE_MCP_* env var")
    .allowExcessArguments(false)
    .action((section, options) => {
      if (section === "env") {
        configureCommand({
          set: options.set.length > 0 ? options.set : undefined,
          list: options.list,
          unset: options.unset,
        });

        return;
      }

      configCommand({ global: options.global, mode: options.mode ?? "stdio" });
    });
}

/** Register the `doctor` command. */
export function registerDoctorCommand(program) {
  program
    .command("doctor")
    .description("Run system health check")
    .option("--json", "print machine-readable JSON to stdout")
    .option("--json-out <path>", "export JSON report to a file and keep Terminal UI on stdout")
    .option("--output <path>", "alias for --json-out")
    .option("--telemetry", "include anonymous usage stats in the report")
    .allowExcessArguments(false)
    .action((options) =>
      doctorCommand({
        telemetry: !!options.telemetry,
        json: !!options.json,
        jsonOut: options.jsonOut ?? options.output,
      }),
    );
}

/** Register the `completions` command. */
export function registerCompletionsCommand(program) {
  program
    .command("completions")
    .description("Generate shell auto-completion script")
    .option("--shell <s>", "zsh (default), bash, fish", "zsh")
    .allowExcessArguments(false)
    .action((options) => completionsCommand({ shell: options.shell }));
}

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
    .option("--agent <name>", "limit to one agent")
    .allowExcessArguments(false)
    .action((options) => {
      agentCommandsCommand({
        dir: options.dir,
        format: options.format,
        list: options.list,
        targets: options.targets,
        sync: options.sync,
        remove: options.remove,
        force: options.force,
        dryRun: options.dryRun,
        agent: options.agent,
      });
    });
}
