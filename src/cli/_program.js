

/**
 * @module cli/program
 *
 * Commander-backed CLI program for rule-mcp.
 *
 * Commander gives us, for free and in a battle-tested way:
 *   - `--flag value` AND `--flag=value` syntax
 *   - strict rejection of unknown options and commands (non-zero exit)
 *   - repeated-option collection (--set A --set B)
 *   - auto `--help` / `--version` per command, generated from the real option
 *     definitions so the help text can never drift from what actually parses
 *   - option value validation via `.choices(...)` (e.g. install --mode)
 *   - `exitOverride()` so the CLI never hard-exits mid-dispatch: every exit
 *     path flows through the single `runCli` error handler and sets
 *     `process.exitCode`, which keeps tests deterministic.
 *
 * Bare invocation (`rule-mcp` with no arguments, or bin spawn by an
 * agent's mcp.json) starts the STDIO server, exactly like before.
 *
 * @see module:index - thin entry wrapper exported as cli()
 * @see module:cli/commands - the semantic handlers this program dispatches to
 */
import { readFileSync } from "node:fs";
import { Command, CommanderError } from "commander";
import { registerServeCommand, registerUpCommand, registerDaemonCommand } from "./_register-server.js";
import { registerInstallCommand, registerUninstallCommand } from "./_register-setup.js";
import { registerSetupCommand } from "./_register-wizard.js";
import { registerConfigCommand, registerDoctorCommand, registerCompletionsCommand } from "./_register-health.js";
import { registerAgentCommandsCommand } from "./_register-agent-commands.js";
import { registerReinstallCommand } from "./_register-reinstall.js";
import { registerCommitLintCommand } from "./_register-commit.js";
import { registerInitCommand } from "./_register-init.js";
import { registerHandoffCommand } from "./_register-handoff.js";
import { registerAdrCommand, registerSkillsCommand, registerFixCommand, registerHandonCommand } from "./_register-session.js";
import {
  registerHelpCommand,
  registerToolsCommand,
  registerStatsCommand,
  registerCacheCommand,
  registerRolesCommand,
  registerGuardCommand,
  registerUpdateCommand,
} from "./_register-info.js";

const version = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).version;

/**
 * Build the complete commander program. Pure (no argv access, no side
 * effects) so tests can build and inspect it without spawning.
 *
 * The registrars run in the exact order the commands always listed in, so the
 * generated help (and the census CLI doc built from it) does not reorder.
 */
export function buildProgram() {
  const program = new Command();

  program
    .name("rule-mcp")
    .description("MCP server for the rule-mcp-* skill ecosystem")
    .version(version, "-v, --version")
    .helpOption("-h, --help")
    .allowExcessArguments(false)
    .showHelpAfterError()
    .exitOverride();

  // The catalog registers the per-skill tools; the core tools the invocation
  // path itself depends on - the gateway and the apply tool - are registered
  // here, once per command. A hook rather than a top-level import, so --help
  // and --version stay off that import graph.
  program.hook("preAction", async () => {
    const { bootstrapCoreTools } = await import("../tools/_bootstrap.js");

    await bootstrapCoreTools();
  });

  // Bare invocation = STDIO server. Agent mcp.json entries spawn the binary
  // with no arguments, so `rule-mcp` with an empty argv must serve.
  program.action(async () => (await import("./commands/_help.js")).serveCommand({ transport: "stdio" }));

  registerHelpCommand(program);
  registerServeCommand(program);
  registerUpCommand(program);
  registerDaemonCommand(program);
  registerInstallCommand(program);
  registerUninstallCommand(program);
  registerSetupCommand(program);
  registerToolsCommand(program);
  registerConfigCommand(program);
  registerDoctorCommand(program);
  registerAdrCommand(program);
  registerHandoffCommand(program);
  registerSkillsCommand(program);
  registerFixCommand(program);
  registerCompletionsCommand(program);
  registerHandonCommand(program);
  registerStatsCommand(program);
  registerCacheCommand(program);
  registerRolesCommand(program);
  registerGuardCommand(program);
  registerUpdateCommand(program);
  registerAgentCommandsCommand(program);
  registerReinstallCommand(program);
  registerCommitLintCommand(program);
  registerInitCommand(program);

  return program;
}

/**
 * Parse and dispatch one CLI invocation, mapping every failure to an exit
 * code instead of a hard exit.
 */
export async function runCli(argv = process.argv.slice(2)) {
  const program = buildProgram();

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      // help/version printed, or parse error already written to stderr.
      process.exitCode = error.exitCode ?? 1;

      return;
    }

    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
