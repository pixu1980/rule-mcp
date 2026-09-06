/** Info command registrars: help, tools, stats, cache, roles, guard, update. */
import { helpCommand, toolsCommand, updateCommand } from "./commands/index.js";
import { Option } from "commander";

/** Register the `help` command. */
export function registerHelpCommand(program) {
  program
    .command("help")
    .description("Show the full usage guide")
    .action(() => {
      helpCommand();
    });
}

/** Register the `tools` command. */
export function registerToolsCommand(program) {
  program
    .command("tools")
    .description("List or call MCP tools directly")
    .argument("<subcommand>", "list | call")
    .argument("[name]", "tool name (only for call)")
    .addOption(new Option("--json [value]", "list as JSON, or JSON arguments for call"))
    .allowExcessArguments(false)
    .action((subcommand, name, options) => {
      // Option is declared with an optional value: `--json` alone sets
      // options.json === true (a flag), `--json '{...}'` sets it to the string.
      const jsonFlag = options.json === true;

      return toolsCommand({
        subcommand,
        toolName: name,
        json: jsonFlag ? "{}" : (options.json ?? "{}"),
        jsonOutput: subcommand === "list" && jsonFlag,
      });
    });
}

/** Register the `stats` command. */
export function registerStatsCommand(program) {
  program
    .command("stats")
    .description("Show telemetry statistics from the local log")
    .allowExcessArguments(false)
    .action(async () => {
      const { aggregate, renderStats } = await import("../core/telemetry/stats/index.js");
      const { readEvents } = await import("../core/telemetry/store/index.js");
      const { telemetryEnabled } = await import("../core/telemetry/recorder/index.js");

      if (telemetryEnabled()) {
        console.log(renderStats(aggregate(readEvents()), { title: "rule telemetry: local log" }));
      } else {
        console.log("Telemetry is disabled (RULE_MCP_NO_TELEMETRY=1). Nothing has been recorded.");
      }
    });
}

/** Register the `cache` command. */
export function registerCacheCommand(program) {
  program
    .command("cache")
    .description("Inspect the on-disk tool cache")
    .argument("[action]", "stats or other cache subcommands", "stats")
    .option("--dir <path>", "cache directory to inspect")
    .allowExcessArguments(false)
    .action(async (action, options) => {
      const { cacheCommand } = await import("./cache/index.js");
      await cacheCommand(action ?? "stats", { dir: options.dir });
    });
}

/** Register the `roles` command. */
export function registerRolesCommand(program) {
  program
    .command("roles")
    .description("Manage review persona roles")
    .argument("[action]", "list | new | deprecate", "list")
    .argument("[id]", "role id (for new/deprecate)")
    .option("--json", "machine-readable JSON output")
    .option("--role <name>", "parent role name")
    .option("--skills <list>", "evidence skills (comma-separated)")
    .option("--years <n>", "required years of experience")
    .option("--lenses <list>", "review lenses (comma-separated)")
    .option("--evidence-skills <list>", "evidence skills alias")
    .option("--by <role>", "role that deprecates this one")
    .allowExcessArguments(false)
    .action(async (action, id, options) => {
      const { rolesCommand } = await import("./roles/index.js");
      rolesCommand(action ?? "list", {
        id,
        json: options.json,
        role: options.role,
        skills: options.skills,
        years: options.years,
        lenses: options.lenses,
        evidenceSkills: options.evidenceSkills,
        by: options.by,
      });
    });
}

/** Register the `guard` command. */
export function registerGuardCommand(program) {
  program
    .command("guard")
    .description("Permission-guard payload processor (invoked by PreToolUse hooks, reads stdin)")
    .argument("[action]", "bash or other guard scope", "bash")
    .allowExcessArguments(false)
    .action(async (action) => {
      const { runGuard } = await import("./guard/index.js");

      await runGuard(action ?? "bash");
    });
}

/** Register the `update` command. */
export function registerUpdateCommand(program) {
  program
    .command("update")
    .description("Self-update from the upstream git repo (fast-forward only)")
    .allowExcessArguments(false)
    .action(() => updateCommand());
}
