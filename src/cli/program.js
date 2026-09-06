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
import { Command, Option, CommanderError } from "commander";
import {
  helpCommand,
  serveCommand,
  daemonCommand,
  installCommand,
  uninstallCommand,
  toolsCommand,
  doctorCommand,
  configCommand,
  configureCommand,
  skillsReloadCommand,
  completionsCommand,
  fixCommand,
  updateCommand,
  agentCommandsCommand,
} from "./commands/index.js";

const version = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).version;

/** Collector for repeatable options: `--set A=1 --set B=2` → ["A=1", "B=2"]. */
const collect = (value, previous) => [...previous, value];

/**
 * Build the complete commander program. Pure (no argv access, no side
 * effects) so tests can build and inspect it without spawning.
 */
export function buildProgram() {
  const program = new Command();

  program
    .name("rule-mcp")
    .description("MCP server for the rule-* skill ecosystem")
    .version(version, "-v, --version")
    .helpOption("-h, --help")
    .allowExcessArguments(false)
    .showHelpAfterError()
    .exitOverride();

  // Bare invocation = STDIO server. Agent mcp.json entries spawn the binary
  // with no arguments, so `rule-mcp` with an empty argv must serve.
  program.action(() => serveCommand({ transport: "stdio" }));

  program
    .command("help")
    .description("Show the full usage guide")
    .action(() => {
      helpCommand();
    });

  program
    .command("serve")
    .alias("dev")
    .description("Start the MCP server (STDIO by default)")
    .option("--transport <type>", "stdio (default), http (Streamable HTTP), or sse (HTTP+SSE)")
    .option("--port <number>", "port for http/sse transport")
    .option("--ssl-cert <path>", "TLS certificate (requires --ssl-key)")
    .option("--ssl-key <path>", "TLS private key (auto-generates self-signed if missing)")
    .allowExcessArguments(false)
    .action((options) => {
      const port = options.port === undefined ? undefined : parseInt(options.port, 10);

      return serveCommand({
        transport: options.transport ?? "stdio",
        port,
        sslCert: options.sslCert,
        sslKey: options.sslKey,
      });
    });

  program
    .command("up")
    .description('Same as "serve --transport sse" (on-demand HTTP daemon)')
    .option("--port <number>", "port for the SSE server")
    .allowExcessArguments(false)
    .action((options) => {
      const port = options.port === undefined ? undefined : parseInt(options.port, 10);

      return serveCommand({ transport: "sse", port });
    });

  program
    .command("daemon")
    .description("Manage the MCP daemon (process and native platform services)")
    .argument("[action]", "start|stop|status|logs|install|uninstall|enable|disable", "status")
    .option("--dry-run", "preview changes without writing (install/uninstall only)")
    .allowExcessArguments(false)
    .action((action, options) => daemonCommand({ action, dryRun: options.dryRun }));

  program
    .command("install")
    .description("Install rule-mcp into an agent/IDE (edits mcp.json)")
    .option("--agent <name>", "target agent, or 'all' for every supported agent", "all")
    .addOption(
      new Option("--mode <name>", "stdio (default), daemon (SSE), or docker").choices([
        "stdio",
        "daemon",
        "sse",
        "docker",
      ]),
    )
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

  program
    .command("adr")
    .description("Create a new Architecture Decision Record (ADR)")
    .argument("[action]", "new")
    .argument("[title]")
    .option("--status <s>", "proposed | accepted (default) | deprecated | superseded")
    .option("--context <text>", "context forcing factors")
    .option("--decision <text>", "decision made and why")
    .option("--consequences <text>", "positive and negative consequences")
    .option("--tags <list>", "comma-separated tags (default: architecture)")
    .allowExcessArguments(false)
    .action(async function adrAction(action, title, options, command) {
      if (action !== "new" || !title) {
        command.outputHelp();

        return;
      }

      const { callTool } = await import("../tools/router/index.js");
      const { loadAllSkills } = await import("../core/skills/_skills.js");
      await loadAllSkills();
      const result = await callTool("pix_process_adr", {
        title,
        status: options.status ?? "accepted",
        context: options.context ?? "",
        decision: options.decision ?? "",
        consequences: options.consequences ?? "",
        tags: (options.tags ?? "architecture").split(","),
      });
      process.stdout.write(`${result.content[0].text}\n`);
    });

  program
    .command("handoff")
    .description("Generate a compressed LLM context handoff summary")
    .argument("[subcommand]", "doctor to repair ADR numbering")
    .option("--dir <path>", "project root (default: .)", ".")
    .option("--format <f>", "full (default), brief, minimal")
    .option("--compress", "aggressively truncate values")
    .option("--mode <m>", "handoff (default) or close-session")
    .option("--fix", "apply the ADR renumber plan")
    .option("--fix-commits", "amend local commit messages to match renumbered ADRs")
    .allowExcessArguments(false)
    .action(async function handoffAction(subcommand, options) {
      if (subcommand === "doctor") {
        const { applyRenumber, planRenumber, renderRenumberPlan, rewriteCommitReferences } =
          await import("../core/docs-numbering/index.js");
        const projectDir = options.dir;
        const onProgress = ({ message }) => process.stdout.write(`  ${message}\n`);
        const plan = planRenumber({ projectDir, onProgress });
        process.stdout.write(`${renderRenumberPlan(plan, { fix: options.fix })}\n`);
        const authors = plan.authors?.length ?? 0;
        const somethingToFix = plan.renames.length > 0 || plan.indexUnordered || authors > 0;

        if (options.fixCommits) {
          const rewrite = rewriteCommitReferences(plan, { projectDir, onProgress });
          process.stdout.write(
            rewrite.refused
              ? `Commit messages left alone: ${rewrite.refused}.\n`
              : `Rewrote ${rewrite.rewritten} commit message(s); ${rewrite.skipped} left for a human.\n`,
          );
        }

        if (options.fix && somethingToFix) {
          const applied = applyRenumber(plan, { projectDir, onProgress });
          process.stdout.write(
            `Renumbered ${applied.renamed} document(s); ${applied.referencesUpdated} file(s) had references updated` +
              `${applied.indexRegenerated ? "; ADR.md regenerated" : ""}` +
              `${applied.authorsNamed > 0 ? `; ${applied.authorsNamed} author(s) named` : ""}.\n`,
          );

          if (!options.fixCommits && plan.renames.length > 0) {
            process.stdout.write("Commit messages were not touched. Add --fix-commits to amend the local ones.\n");
          }
        }

        process.exitCode = somethingToFix && !options.fix ? 1 : 0;

        return;
      }

      const { registerProcessHandoffTool } = await import("../tools/handoff.js");
      const { callTool: ct } = await import("../tools/router/index.js");
      registerProcessHandoffTool();
      const handoffRes = await ct("rule_tool_process_handoff", {
        projectDir: options.dir,
        compress: options.compress,
        format: options.format ?? "full",
        mode: options.mode ?? "handoff",
      });

      process.stdout.write(`${handoffRes.content[0].text}\n`);
    });

  program
    .command("skills")
    .description("Manage the rule AI skill system")
    .argument("[action]", "install | list | reload")
    .option("--scope <s>", "global (default, ~/.agents/skills/) or project (.agents/skills/)", "global")
    .option("--all", "pre-select all skills")
    .option("--json", "list as machine-readable JSON")
    .allowExcessArguments(false)
    .action(async function skillsAction(action, options, command) {
      if (!action) {
        command.outputHelp();

        return;
      }

      switch (action) {
        case "install": {
          const { skillsInstallCommand } = await import("./skills-install.js");
          await skillsInstallCommand({ scope: options.scope, selectAll: options.all });
          break;
        }
        case "list": {
          const { skillsListCommand } = await import("./skills-install.js");
          skillsListCommand({ json: options.json });
          break;
        }
        case "reload": {
          await skillsReloadCommand();
          break;
        }
        default: {
          throw new Error(`Unknown skills action: ${action}. Use 'rule-mcp skills --help'.`);
        }
      }
    });

  program
    .command("fix")
    .description("Validate and auto-fix project file tree structure")
    .option("--dir <path>", "project root (default: .)", ".")
    .option("--src-dir <path>", "source directory (default: src)", "src")
    .option("--mode <m>", "lint (scan + report) or fix (scan + auto-correct)", "lint")
    .option("--no-dry-run", "apply fixes instead of previewing")
    .allowExcessArguments(false)
    .action((options) =>
      fixCommand({ dir: options.dir, srcDir: options.srcDir, mode: options.mode, dryRun: options.dryRun }),
    );

  program
    .command("completions")
    .description("Generate shell auto-completion script")
    .option("--shell <s>", "zsh (default), bash, fish", "zsh")
    .allowExcessArguments(false)
    .action((options) => completionsCommand({ shell: options.shell }));

  program
    .command("handon")
    .description("Verify the last handoff against the repo now")
    .option("--dir <path>", "project root (default: .)", ".")
    .option("--file <path>", "verify a single handoff file")
    .option("--list", "list handoffs")
    .allowExcessArguments(false)
    .action(async (options) => {
      const { handon } = await import("../tools/handon.js");
      process.stdout.write(
        `${handon({ projectDir: options.dir, file: options.file || undefined, list: options.list }).text}\n`,
      );
    });

  program
    .command("stats")
    .description("Show telemetry statistics from the local log")
    .allowExcessArguments(false)
    .action(async () => {
      const { aggregate, renderStats } = await import("../core/telemetry/_stats.js");
      const { readEvents } = await import("../core/telemetry/_store.js");
      const { telemetryEnabled } = await import("../core/telemetry/_telemetry.js");

      if (telemetryEnabled()) {
        console.log(renderStats(aggregate(readEvents()), { title: "rule telemetry: local log" }));
      } else {
        console.log("Telemetry is disabled (RULE_MCP_NO_TELEMETRY=1). Nothing has been recorded.");
      }
    });

  program
    .command("cache")
    .description("Inspect the on-disk tool cache")
    .argument("[action]", "stats or other cache subcommands", "stats")
    .option("--dir <path>", "cache directory to inspect")
    .allowExcessArguments(false)
    .action(async (action, options) => {
      const { cacheCommand } = await import("./cache.js");
      await cacheCommand(action ?? "stats", { dir: options.dir });
    });

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
      const { rolesCommand } = await import("./roles.js");
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

  program
    .command("guard")
    .description("Permission-guard payload processor (invoked by PreToolUse hooks, reads stdin)")
    .argument("[action]", "bash or other guard scope", "bash")
    .allowExcessArguments(false)
    .action(async (action) => {
      const { runGuard } = await import("./guard.js");
      await runGuard(action ?? "bash");
    });

  program
    .command("update")
    .description("Self-update from the upstream git repo (fast-forward only)")
    .allowExcessArguments(false)
    .action(() => updateCommand());

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

  return program;
}

/**
 * Parse argv through the commander program and normalize every exit path into
 * `process.exitCode`.
 *
 * Commander never calls process.exit (exitOverride): help/version/parse errors
 * surface as CommanderError, handler failures as plain thrown Errors. Both are
 * collapsed here so the process always ends with a deterministic exit code and
 * strict validation in front of it.
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
