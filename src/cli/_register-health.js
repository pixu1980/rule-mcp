

/**
 * @module cli/register-health
 *
 * The commands that report rather than install: config, doctor, completions.
 *
 * Split out of `_register-setup.js`, which is the install and uninstall pair,
 * for the size cap and because the two sets have nothing to say to each other
 * (ADR 061).
 *
 * The handlers are imported inside the actions, not at the top of the file:
 * the command declarations are what `--help` renders, and a static handler
 * import made `--help` pay for the server and every tool registration.
 */
/** Collector for repeatable options: `--set A=1 --set B=2` -> ["A=1", "B=2"]. */
const collect = (value, previous) => [...previous, value];

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
    .action(async (section, options) => {
      if (section === "env") {
        (await import("./commands/_configure.js")).configureCommand({
          set: options.set.length > 0 ? options.set : undefined,
          list: options.list,
          unset: options.unset,
        });

        return;
      }

      (await import("./commands/_tools.js")).configCommand({ global: options.global, mode: options.mode ?? "stdio" });
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
    .action(async (options) =>
      (await import("./commands/_health.js")).doctorCommand({
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
    .action(async (options) => (await import("./commands/_health.js")).completionsCommand({ shell: options.shell }));
}
