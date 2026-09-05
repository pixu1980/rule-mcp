#!/usr/bin/env node

import { readFileSync } from "node:fs";

/**
 * @module index
 *
 * CLI entry point for rule-mcp.
 * Parses command-line arguments and dispatches to the appropriate command handler.
 *
 * This is the single entry point called by bin/rule-mcp.js.
 *
 * Usage:
 *   rule-mcp serve
 *   rule-mcp daemon start|stop|status|logs
 *   rule-mcp install --agent <name> [--dry-run] [--force]
 *   rule-mcp uninstall --agent <name> [--dry-run]
 *   rule-mcp tools list|call <name> --json '{...}'
 *   rule-mcp doctor
 *   rule-mcp config [--global]
 *   rule-mcp skills reload
 */

import { installProcessErrorHandlers } from "./utils/sandbox.js";
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
} from "./cli/commands.js";

// Install global error handlers at process level
// Prevents uncaught exceptions from crashing the server
installProcessErrorHandlers();

const arguments_ = process.argv.slice(2);
const command = arguments_[0] ?? "serve";

/** Get a named CLI argument value. */
const getArgument = (name, fallback) => {
  const index = arguments_.indexOf(name);

  return index === -1 ? fallback : (arguments_[index + 1] ?? fallback);
};

/** Get all values for a repeated flag (e.g. --set KEY=VALUE --set KEY2=VALUE2). */
const getArguments = (name) => {
  const values = [];

  for (let index = 0; index < arguments_.length - 1; index++) {
    if (arguments_[index] === name) {
      values.push(arguments_[index + 1]);
    }
  }

  return values.length > 0 ? values : undefined;
};

/** Check if a flag is present. */
const hasFlag = (name) => arguments_.includes(name);

// ─── Per-command help printers ───────────────────────────────────

const printServeHelp = () =>
  process.stdout.write(`
Usage: rule-mcp serve [options]

Start the MCP server.

Options:
  --transport <type>   Transport: stdio (default), http (Streamable HTTP, current
                       MCP spec), or sse (legacy HTTP+SSE, back-compat)
  --port <number>      Port for http/sse transport (default: 37999, or $RULE_MCP_PORT)
  --ssl-cert <path>    TLS certificate (requires --ssl-key)
  --ssl-key <path>     TLS private key (requires --ssl-cert)
                       Auto-generates self-signed if missing

On-demand from repo:
  pnpm dev             Start STDIO server (spawnable by IDE via mcp.json)
  pnpm up              Start SSE server (on-demand HTTP daemon)
  pnpm start           Same as pnpm dev (STDIO)

The server prints the mcp.json config snippet needed
for agent integration on startup.

Aliases:
  rule-mcp dev   Same as "serve" (STDIO)
  rule-mcp up    Same as "serve --transport sse"

Examples:
  rule-mcp serve
  rule-mcp serve --transport sse
  pnpm dev
`);

const printDaemonHelp = () =>
  process.stdout.write(`
Usage: rule-mcp daemon <action> [options]

Manage the MCP daemon (SSE on first free port in range 3000-6000).

Process actions (cross-platform, no reboot persistence):
  start    Start background daemon process
  stop     Stop daemon process
  status   Check daemon status
  logs     Show daemon logs

Service actions (platform-native, persists across reboots):
  install    Install native service (macOS: LaunchAgent → Login Items)
  uninstall  Remove native service
  enable     Load/activate native service
  disable    Unload/deactivate native service

Options:
  --dry-run    Preview changes without writing (install/uninstall only)

Examples:
  rule-mcp daemon start           # Start process daemon
  rule-mcp daemon status          # Check status
  rule-mcp daemon install         # Install native service
  rule-mcp daemon uninstall       # Remove native service
  rule-mcp daemon enable          # Load native service
  rule-mcp daemon disable         # Unload native service
`);

const printInstallHelp = () =>
  process.stdout.write(`
Usage: rule-mcp install --agent <name> [options]

Install rule-mcp into an agent/IDE (edits mcp.json).

Supported agents (23 total - matching tokensave's 18+ agents):
  Coding Agents: claude, codex, cursor, copilot, gemini, pi,
                 cline, roo, zed, opencode, antigravity, windsurf,
                 kilo, kimi, vibe, grok, droid, kiro, qwen
  IDEs:          vscode, jetbrains, neovim, emacs

Options:
  --agent <name>    Target agent (or "all" for every supported agent)
  --mode <name>     stdio (default), daemon (SSE), or docker
  --global          Use clean command path (requires global install)
  --force           Override existing configuration
  --dry-run         Preview without writing
  --json            Print machine-readable JSON instead of Terminal UI

Example:
  rule-mcp install --agent claude
  rule-mcp install --agent all        # Install into every agent
`);

const printUninstallHelp = () =>
  process.stdout.write(`
Usage: rule-mcp uninstall --agent <name> [options]

Remove rule-mcp from an agent/IDE.

Supported agents (23 total):
  claude, codex, cursor, copilot, gemini, pi, cline, roo, zed,
  opencode, antigravity, windsurf, kilo, kimi, vibe, grok, droid,
  kiro, qwen, vscode, jetbrains, neovim, emacs

Options:
  --agent <name>    Target agent (or "all" for every configured agent)
  --dry-run         Preview without removing
  --json            Print machine-readable JSON instead of Terminal UI

Example:
  rule-mcp uninstall --agent claude
`);

const printToolsHelp = () =>
  process.stdout.write(`
Usage: rule-mcp tools <subcommand> [args]

List or call MCP tools directly.

Subcommands:
  list                     List all registered tools as Terminal UI
  list --json              Export registered tools as JSON
  call <name> --json '{ }'  Call a tool with JSON arguments

Examples:
  rule-mcp tools list
  rule-mcp tools call rule --json '{"prompt": "I need a button"}'
`);

const printConfigHelp = () =>
  process.stdout.write(`
Usage: rule-mcp config [options]

Print the mcp.json configuration snippet for MCP agent integration.

Options:
  --global          Use clean command path (requires global install)
  --mode <name>     stdio (default), daemon (SSE), or docker

Example:
  rule-mcp config --mode daemon
`);

const printDoctorHelp = () =>
  process.stdout.write(`
Usage: rule-mcp doctor [options]

Run system health check. Defaults to a human-friendly Terminal UI.

Options:
  --json              Print machine-readable JSON to stdout
  --json-out <path>   Export JSON report to a file and keep Terminal UI on stdout
  --output <path>     Alias for --json-out
  --telemetry         Include anonymous usage stats in output/export
`);

const printAdrHelp = () =>
  process.stdout.write(`
Usage: rule-mcp adr new "<title>" [options]

Create a new Architecture Decision Record (ADR) in docs/adr/.
Auto-numbers and maintains index.

Options:
  --status <s>         proposed | accepted (default) | deprecated | superseded
  --context "..."      Context forcing factors
  --decision "..."     Decision made and why
  --consequences "..." Positive and negative consequences
  --tags "a,b,c"       Comma-separated tags (default: architecture)

Example:
  rule-mcp adr new "Use PostgreSQL" --status accepted --tags database
`);

const printHandoffHelp = () =>
  process.stdout.write(`
Usage: rule-mcp handoff [options]

Generate a compressed LLM context handoff summary.
Paste the output into a new chat to resume work.

Options:
  --dir <path>      Project root (default: .)
  --format <f>      Detail: full (default), brief, minimal
  --compress        Aggressively truncate values
  --mode <m>        handoff (default) or close-session (full close with git diff + docs scan)

Examples:
  rule-mcp handoff
  rule-mcp handoff --compress | pbcopy
  rule-mcp handoff --format minimal
  rule-mcp handoff --mode close-session    # Full session close
`);

const printSkillsHelp = () =>
  process.stdout.write(`
Usage: rule-mcp skills <action> [options]

Manage rule AI skill system.

Actions:
  install           Interactive skill installer (checkbox selection)
    --scope <s>       global (default, ~/.agents/skills/) or project (.agents/skills/)
    --all             Pre-select all skills
  list              List all available skills as Terminal UI
    --json            Export machine-readable JSON
  reload            Force-reload all skills from disk (flush cache)

Examples:
  rule-mcp skills install
  rule-mcp skills install --scope project
  rule-mcp skills install --all
  rule-mcp skills list
  rule-mcp skills reload
`);

const printFixHelp = () =>
  process.stdout.write(`
Usage: rule-mcp fix [options]

Validate and auto-fix project file tree structure against rule AI\nconventions (barrel files, _PascalCase naming).

Options:
  --dir <path>      Project root (default: .)
  --src-dir <path>  Source directory (default: src)
  --mode <m>        lint (scan + report), fix (scan + auto-correct) (default: lint)
  --dry-run         Preview fixes without applying

Examples:
  rule-mcp fix
  rule-mcp fix --mode lint
  rule-mcp fix --mode fix --no-dry-run
`);

const printCompletionsHelp = () =>
  process.stdout.write(`
Usage: rule-mcp completions [options]

Generate shell auto-completion script.

Options:
  --shell <s>    Shell: zsh (default), bash, fish

Examples:
  rule-mcp completions --shell zsh > ~/.zsh/completions/_rule-mcp
  rule-mcp completions --shell bash > /etc/bash_completion.d/rule-mcp
  rule-mcp completions --shell fish > ~/.config/fish/completions/rule-mcp.fish
`);

/**
 * Main CLI dispatch function.
 * Parses the command and runs the appropriate handler.
 */
export async function cli() {
  try {
    if (command === "help") {
      helpCommand();

      return;
    }

    if (command === "version" || hasFlag("--version") || hasFlag("-v")) {
      const package_ = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
      console.log(package_.version);

      return;
    }

    switch (command) {
      case "serve": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printServeHelp();

          return;
        }
        {
          const portArgument = getArgument("--port");
          await serveCommand({
            transport: getArgument("--transport", "stdio"),
            port: portArgument === undefined ? undefined : parseInt(portArgument, 10),
            sslCert: getArgument("--ssl-cert"),
            sslKey: getArgument("--ssl-key"),
          });
        }

        break;
      }

      case "daemon": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printDaemonHelp();

          return;
        }

        daemonCommand({ action: arguments_[1] ?? "status", dryRun: hasFlag("--dry-run") });
        break;
      }

      case "install": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printInstallHelp();

          return;
        }

        installCommand({
          agent: getArgument("--agent", "all"),
          dryRun: hasFlag("--dry-run"),
          force: hasFlag("--force"),
          global: hasFlag("--global"),
          mode: getArgument("--mode", "stdio"),
          json: hasFlag("--json"),
        });
        break;
      }

      case "uninstall": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printUninstallHelp();

          return;
        }

        uninstallCommand({
          agent: getArgument("--agent", "all"),
          dryRun: hasFlag("--dry-run"),
          json: hasFlag("--json"),
        });
        break;
      }

      case "tools": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printToolsHelp();

          return;
        }

        await toolsCommand({
          subcommand: arguments_[1] ?? "list",
          toolName: arguments_[2],
          json: getArgument("--json", "{}"),
          jsonOutput: (arguments_[1] ?? "list") === "list" && hasFlag("--json"),
        });
        break;
      }

      case "config": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printConfigHelp();

          return;
        }

        if (arguments_[1] === "env") {
          configureCommand({ set: getArguments("--set"), list: hasFlag("--list"), unset: getArgument("--unset") });
        } else {
          configCommand({ global: hasFlag("--global"), mode: getArgument("--mode", "stdio") });
        }

        break;
      }

      case "doctor": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printDoctorHelp();

          return;
        }

        await doctorCommand({
          telemetry: hasFlag("--telemetry"),
          json: hasFlag("--json"),
          jsonOut: getArgument("--json-out", getArgument("--output")),
        });
        break;
      }

      case "adr": {
        if (hasFlag("--help") || hasFlag("-h") || !arguments_[1]) {
          printAdrHelp();

          return;
        }

        if (arguments_[1] === "new" && arguments_[2]) {
          const { callTool } = await import("./tools/router.js");
          const { loadAllSkills } = await import("./core/skills.js");
          await loadAllSkills();
          const result = await callTool("pix_process_adr", {
            title: arguments_[2],
            status: getArgument("--status", "accepted"),
            context: getArgument("--context", ""),
            decision: getArgument("--decision", ""),
            consequences: getArgument("--consequences", ""),
            tags: (getArgument("--tags", "architecture") || "architecture").split(","),
          });
          process.stdout.write(result.content[0].text + "\n");
        } else if (arguments_[1] === "new" && !arguments_[2]) {
          printAdrHelp();
        } else {
          printAdrHelp();
        }

        break;
      }

      case "handoff": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printHandoffHelp();

          return;
        }

        const { registerProcessHandoffTool } = await import("./tools/handoff.js");
        const { callTool: ct } = await import("./tools/router.js");
        registerProcessHandoffTool();
        const handoffRes = await ct("rule_tool_process_handoff", {
          projectDir: getArgument("--dir", "."),
          compress: hasFlag("--compress"),
          format: getArgument("--format", "full"),
          mode: getArgument("--mode", "handoff"),
        });
        process.stdout.write(handoffRes.content[0].text + "\n");
        break;
      }

      case "skills": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printSkillsHelp();

          return;
        }

        switch (arguments_[1]) {
          case "install": {
            const { skillsInstallCommand } = await import("./cli/skills-install.js");
            await skillsInstallCommand({ scope: getArgument("--scope", "global"), selectAll: hasFlag("--all") });

            break;
          }
          case "list": {
            const { skillsListCommand } = await import("./cli/skills-install.js");

            skillsListCommand({ json: hasFlag("--json") });

            break;
          }
          case "reload": {
            await skillsReloadCommand();

            break;
          }
          default: {
            if (arguments_[1]) {
              throw new Error(`Unknown skills action: ${arguments_[1] ?? ""}. Use 'rule-mcp skills --help'.`);
            }

            printSkillsHelp();
          }
        }

        break;
      }

      case "fix": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printFixHelp();

          return;
        }

        await fixCommand({
          dir: getArgument("--dir", "."),
          srcDir: getArgument("--src-dir", "src"),
          mode: getArgument("--mode", "lint"),
          dryRun: hasFlag("--no-dry-run") ? false : true,
        });
        break;
      }

      case "completions": {
        if (hasFlag("--help") || hasFlag("-h")) {
          printCompletionsHelp();

          return;
        }

        completionsCommand({ shell: getArgument("--shell", "zsh") });
        break;
      }

      case "update": {
        await updateCommand();
        break;
      }

      case "agent-commands": {
        if (hasFlag("--help") || hasFlag("-h")) {
          process.stderr.write(
            `Usage: rule-mcp agent-commands [options]\n\n` +
              `Registry-driven agent slash-command management.\n\n` +
              `  --dir <path>     Write commands to this directory\n` +
              `  --format <f>     args (default), workflow, gemini, prompt, plain\n` +
              `  --list           List command names\n` +
              `  --targets        Print resolved target directories\n` +
              `  --sync           Write to EVERY detected agent dir\n` +
              `  --remove         Remove instead of writing\n` +
              `  --force          Overwrite existing files\n` +
              `  --dry-run        Preview without writing\n` +
              `  --agent <name>   Limit to one agent\n`,
          );

          return;
        }

        agentCommandsCommand({
          dir: getArgument("--dir"),
          format: getArgument("--format", "args"),
          list: hasFlag("--list"),
          targets: hasFlag("--targets"),
          sync: hasFlag("--sync"),
          remove: hasFlag("--remove"),
          force: hasFlag("--force"),
          dryRun: hasFlag("--dry-run"),
          agent: getArgument("--agent"),
        });
        break;
      }

      default: {
        throw new Error(`Unknown command: ${command}. Run 'rule-mcp help' for usage.`);
      }
    }
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
