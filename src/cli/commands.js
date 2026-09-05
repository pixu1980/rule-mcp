/**
 * @module cli/commands
 *
 * CLI command handlers for rule-mcp.
 * Each command is a named export that receives parsed arguments
 * and performs its action.
 *
 * @see module:index - CLI entry point that dispatches to these commands
 */

import { spawn, execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server.js";
import { startSseServer } from "../transport/sse.js";
import { startHttpServer } from "../transport/http.js";
import { callTool, listTools } from "../tools/router.js";
import {
  installAgent,
  mcpServerConfig,
  writeEnvConfig as writeEnvironmentConfig,
  readEnvConfig as readEnvironmentConfig,
} from "./install.js";
import { uninstallFromAgent } from "./uninstall.js";
import { HELP_TEXT } from "./help-text.js";
import { getRuntimePaths } from "./paths.js";
import { loadAllSkills } from "../core/skills.js";
import { formatDoctorTerminal, runDoctor } from "./doctor.js";
import { formatInstallResult, formatToolsList, formatUninstallResult } from "./tui.js";
import { generateCompletions } from "./completions.js";
import { commandNames, renderAgentCommandFiles, FORMAT_EXT } from "../core/agent-commands.js";
import { resolveCommandTargets } from "../core/agent-command-targets.js";

import {
  installDaemonService,
  uninstallDaemonService,
  checkDaemonService,
  formatDaemonStatus,
  startDaemonProcess,
  stopDaemonProcess,
  daemonProcessStatus,
  detectPlatform,
  getServiceFilePath,
  getServiceName,
} from "./daemon.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entrypoint = resolve(__dirname, "..", "..", "bin", "rule-mcp.js");

const print = (v) => process.stdout.write(`${v}\n`);
const printJson = (v) => print(JSON.stringify(v, null, 2));
const parseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/** Safely run a shell command, ignoring errors. */
function tryExec(command, options = {}) {
  try {
    return execSync(command, { encoding: "utf8", timeout: 10_000, stdio: "pipe", ...options });
  } catch {
    return "";
  }
}

/**
 * Print usage help text.
 */
export function helpCommand() {
  print(HELP_TEXT);
}

/**
 * The serve subcommand: start the MCP server over the chosen transport.
 *
 * @param {object} [opts]
 */
export async function serveCommand(opts = {}) {
  await loadAllSkills();
  const transport = opts.transport ?? "stdio";

  if (transport === "sse" || transport === "http") {
    const scheme = opts.sslCert && opts.sslKey ? "https" : "http";
    // Port/host resolution (explicit --port > RULE_MCP_PORT > canonical default)
    // is centralized in the transport module so CLI, daemon, and Docker all agree.
    // "http" = Streamable HTTP (current spec); "sse" = HTTP+SSE (back-compat).
    const start = transport === "http" ? startHttpServer : startSseServer;
    const endpoint = transport === "http" ? "mcp" : "sse";
    const { port, host } = await start({
      port: opts.port,
      sslCert: opts.sslCert,
      sslKey: opts.sslKey,
    });
    // Advertise a connectable host: 0.0.0.0 means "all interfaces", so clients use loopback.
    const connectHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
    const configSnippet = JSON.stringify(
      {
        mcpServers: mcpServerConfig(entrypoint, { mode: "daemon", port }),
      },
      null,
      2,
    );
    console.error(
      `\nrule-mcp ${transport === "http" ? "Streamable HTTP" : "SSE"} server listening on ${scheme}://${connectHost}:${port}/${endpoint}\n`,
    );
    console.error(`Config for agent's mcp.json:\n`);
    console.error(configSnippet);
    console.error(``);
    console.error(`Then start an agent configured for HTTP/SSE.`);
    console.error(``);
    // The daemon runs until it is told to stop, and the signal is what tells
    // it: the wait ends when the cleanups the transport registered have run, so
    // sessions, sockets and buffered metrics are closed before the exit rather
    // than dropped by it.
    const { installSignalHandlers, registerCleanup, whenShutdown } = await import("../core/lifecycle.js");
    const { startIdleReclaim, stopIdleReclaim } = await import("../core/reclaim.js");

    registerCleanup("idle-reclaim", () => stopIdleReclaim());
    installSignalHandlers();
    startIdleReclaim();
    // Printed AFTER the handlers exist: "listening" only says the socket is
    // open, and a signal delivered between those two moments killed the
    // process with Node's default disposition instead of the graceful path.
    console.error("rule-mcp ready (signal handlers installed)");
    await whenShutdown();
  } else {
    const configSnippet = JSON.stringify(
      {
        mcpServers: mcpServerConfig(entrypoint),
      },
      null,
      2,
    );
    console.error(`rule-mcp starting (STDIO transport)`);
    console.error(`Config for agent's mcp.json:\n`);
    console.error(configSnippet);
    console.error(``);
    console.error(`Add to agent config, then agent spawns this process.`);
    console.error(`To test: run tools from another terminal with:`);
    console.error(`  echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node ${process.argv[1]} serve`);
    console.error(``);
    await startServer();
  }
}

/**
 * Manage the MCP daemon process and native platform services.
 *
 * Sub-commands:
 *   start|stop|status|logs  - Process-based daemon (no reboot persistence)
 *   install|uninstall       - Platform-native service (LaunchAgent / systemd / Win Service)
 *   enable|disable          - Load/unload the native service without removing it
 *
 * Platform-native services (install):
 *   macOS:   LaunchAgent plist → appears in System Settings → General → Login Items
 *   Linux:   systemd user service → systemctl --user
 *   Windows: Windows Service → sc.exe
 *
 * @param {{ action: string, dryRun?: boolean }} opts
 */
export async function daemonCommand(opts) {
  const p = getRuntimePaths();
  const { action = "status", dryRun = false } = opts;

  switch (action) {
    case "install": {
      print(`Installing ${detectPlatform()} daemon service...`);
      const result = installDaemonService({ dryRun });

      if (result.ok) {
        switch (result.platform) {
          case "macos": {
            print(`✓ LaunchAgent created: ${result.result.path}`);
            print(`  The daemon should now appear in:`);
            print(`    System Settings → General → Login Items & Extensions`);

            if (result.result.action === "loaded") {
              print(`  ✓ launchctl loaded the service (it will start at next login)`);
              const svcName = getServiceName();

              if (svcName) {
                print(`  To start now: launchctl start ${svcName}`);
              }
            }

            break;
          }
          case "linux": {
            print(`✓ systemd unit created: ${result.result.path}`);

            if (result.result.action === "enabled-and-started") {
              print(`  ✓ Service enabled and started`);
            }

            break;
          }
          case "windows": {
            print(`✓ Windows service created: ${result.result.name}`);

            if (result.result.action.includes("started")) {
              print(`  ✓ Service started`);
            }

            break;
          }
          default: {
            print(`✓ Service installed (${result.service}): ${result.result.action}`);
          }
        }
      } else {
        print(`✗ Failed: ${result.result.error || "unknown error"}`);
      }

      break;
    }
    case "uninstall": {
      print(`Removing ${detectPlatform()} daemon service...`);
      const result = uninstallDaemonService({ dryRun });

      if (result.ok) {
        print(`✓ ${result.service} service removed (${result.result.action})`);
      } else {
        print(`✗ Failed: ${result.result.error || "unknown error"}`);
      }

      break;
    }
    case "enable": {
      const svcPath = getServiceFilePath();
      const svcName = getServiceName();

      if (!svcPath) {
        print("No native service file for this platform. Try: rule-mcp daemon install");
        break;
      }

      print(`Enabling service: ${svcName}`);

      if (detectPlatform() === "macos") {
        tryExec(`launchctl load -w "${svcPath}"`);
        print(`✓ Service loaded (${svcPath})`);
        print(`  It will start at next login and appears in Login Items.`);
      } else if (detectPlatform() === "linux") {
        tryExec(`systemctl --user enable "${svcName}"`);
        tryExec(`systemctl --user start "${svcName}"`);
        print(`✓ Service enabled and started`);
      } else if (detectPlatform() === "windows") {
        tryExec(`sc config "${svcName}" start= auto`);
        tryExec(`sc start "${svcName}"`);
        print(`✓ Service enabled and started`);
      }

      break;
    }
    case "disable": {
      const svcPath = getServiceFilePath();
      const svcName = getServiceName();

      if (!svcPath) {
        print("No native service file for this platform. Try: rule-mcp daemon uninstall");
        break;
      }

      print(`Disabling service: ${svcName}`);

      if (detectPlatform() === "macos") {
        tryExec(`launchctl unload -w "${svcPath}"`);
        print(`✓ Service unloaded (${svcPath})`);
        print(`  It will no longer start at login and is removed from Login Items.`);
      } else if (detectPlatform() === "linux") {
        tryExec(`systemctl --user stop "${svcName}"`);
        tryExec(`systemctl --user disable "${svcName}"`);
        print(`✓ Service stopped and disabled`);
      } else if (detectPlatform() === "windows") {
        tryExec(`sc stop "${svcName}"`);
        tryExec(`sc config "${svcName}" start= demand`);
        print(`✓ Service stopped and disabled`);
      }

      break;
    }
    case "start": {
      const nativeStatus = checkDaemonService();

      if (nativeStatus.installed && detectPlatform() !== "unknown") {
        print(`Using native service (${nativeStatus.service})`);

        if (detectPlatform() === "macos") {
          tryExec(`launchctl start ${getServiceName()}`);
          print(`✓ Service started via launchctl`);
        } else if (detectPlatform() === "linux") {
          tryExec(`systemctl --user start "${getServiceName()}"`);
          print(`✓ Service started via systemctl`);
        } else if (detectPlatform() === "windows") {
          tryExec(`sc start "${getServiceName()}"`);
          print(`✓ Service started via sc`);
        }

        break;
      }
      // Fallback to process daemon
      const proc = startDaemonProcess({ dryRun });

      if (proc.pid) {
        print(`Daemon started (pid ${proc.pid})`);
      } else if (proc.action === "already-running") {
        print(`Daemon already running (pid ${proc.pid})`);
      } else {
        print(`Daemon: ${proc.action}`);
      }

      break;
    }
    case "stop": {
      const nativeStatus = checkDaemonService();

      if (nativeStatus.installed && detectPlatform() !== "unknown") {
        if (detectPlatform() === "macos") {
          tryExec(`launchctl kill SIGTERM ${getServiceName()}`);
        } else if (detectPlatform() === "linux") {
          tryExec(`systemctl --user stop "${getServiceName()}"`);
        } else if (detectPlatform() === "windows") {
          tryExec(`sc stop "${getServiceName()}"`);
        }

        print(`✓ Service stopped`);
        break;
      }
      // Fallback to process daemon
      const result = await stopDaemonProcess({ dryRun });
      print(result.action === "not-running" ? "Daemon not running" : "Daemon stopped");
      break;
    }
    case "status": {
      print(formatDaemonStatus());
      break;
    }
    case "logs": {
      if (!existsSync(p.logFile)) {
        print("No logs yet");

        return;
      }

      print(readFileSync(p.logFile, "utf8"));
      break;
    }
    default: {
      throw new Error(
        `Unknown daemon action: ${action}. Available: start, stop, status, logs, install, uninstall, enable, disable`,
      );
    }
  }
}

/**
 * Install rule-mcp into an agent/IDE.
 *
 * @param {{ agent: string, dryRun: boolean, force: boolean, global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker" }} opts
 */
export function installCommand(opts) {
  const result = installAgent({
    agent: opts.agent,
    force: opts.force,
    dryRun: opts.dryRun,
    global: opts.global,
    mode: opts.mode,
    entrypoint,
  });
  if (opts.json) {
    printJson(result);
  } else {
    print(formatInstallResult(result));
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

/**
 * Uninstall rule-mcp from an agent/IDE.
 * Removes the rule-mcp entry from the agent config file.
 *
 * @param {{ agent: string, dryRun: boolean }} opts
 */
export function uninstallCommand(opts) {
  const result = uninstallFromAgent({ agent: opts.agent, dryRun: opts.dryRun });

  if (opts.json) {
    printJson(result);
  } else {
    print(formatUninstallResult(result));
  }
}

/**
 * List or call MCP tools directly.
 *
 * @param {{ subcommand: string, toolName?: string, json?: string }} opts
 */
export async function toolsCommand(opts) {
  await loadAllSkills();
  const { subcommand = "list", toolName, json } = opts;

  if (subcommand === "list") {
    const tools = listTools().map((t) => ({ name: t.name, description: t.description }));

    if (opts.jsonOutput) {
      printJson(tools);
    } else {
      print(formatToolsList(tools));
    }
  } else if (subcommand === "call") {
    const input = parseJson(json ?? "{}");
    const previousAutoAdr = process.env.RULE_MCP_DISABLE_AUTO_ADR;
    process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";
    try {
      printJson(await callTool(toolName, input));
    } finally {
      if (previousAutoAdr === undefined) {
        delete process.env.RULE_MCP_DISABLE_AUTO_ADR;
      } else {
        process.env.RULE_MCP_DISABLE_AUTO_ADR = previousAutoAdr;
      }
    }
  } else {
    throw new Error(`Unknown tools action: ${subcommand}`);
  }
}

/**
 * Print the MCP server config for direct use in mcp.json.
 *
 * @param {{ global?: boolean }} opts
 */
export function configCommand(opts = {}) {
  print(JSON.stringify(mcpServerConfig(entrypoint, { global: opts.global, mode: opts.mode }), null, 2));
}

/**
 * Configure RULE_MCP_* environment variables for the MCP server.
 * Interactive prompts if no --set arguments provided.
 *
 * @param {{ set?: string[], list?: boolean, unset?: string }} opts
 */
export function configureCommand(opts = {}) {
  const RULE_MCP_VARS = {
    RULE_MCP_MINIMAL_TOOLS: {
      desc: "Expose only the 10 dispatcher/action tools (fits client tool caps, cheaper context).",
      values: "1 = enable",
    },
    RULE_MCP_AUTO_ADR: { desc: "Automatically log architecture decisions.", values: "1 = enable" },
    RULE_MCP_DISABLE_AUTO_ADR: {
      desc: "Disable automatic ADR logging (used internally).",
      values: "1 = disable",
    },
    RULE_MCP_DAEMON: { desc: "Run as daemon process.", values: "1 = enable" },
  };

  if (opts.list) {
    const saved = readEnvironmentConfig();
    const lines = ["Current RULE_MCP_* environment variables:", ""];

    for (const [key, meta] of Object.entries(RULE_MCP_VARS)) {
      const value = saved[key] || "(not set)";
      lines.push(`  ${key}=${value}`, `    ${meta.desc}`, `    Values: ${meta.values}`, "");
    }

    print(lines.join("\n"));

    return;
  }

  if (opts.unset) {
    const saved = readEnvironmentConfig();
    delete saved[opts.unset];
    writeEnvironmentConfig(saved);
    print(`Unset ${opts.unset}`);

    return;
  }

  if (opts.set && opts.set.length > 0) {
    const environment = {};

    for (const pair of opts.set) {
      const eqIndex = pair.indexOf("=");

      if (eqIndex < 1) {
        throw new Error(`Invalid env format: "${pair}". Use KEY=VALUE.`);
      }

      environment[pair.slice(0, eqIndex)] = pair.slice(eqIndex + 1);
    }

    writeEnvironmentConfig(environment);
    print(`Saved ${Object.keys(environment).length} environment variable(s).`);

    return;
  }

  // Interactive mode: readline prompts
  print("Configure RULE_MCP_* environment variables (leave empty to skip):");
  print("");
  const saved = readEnvironmentConfig();
  const readline = require("node:readline").createInterface({ input: process.stdin, output: process.stdout });
  const keys = Object.keys(RULE_MCP_VARS);
  let index = 0;

  const ask = () => {
    if (index >= keys.length) {
      readline.close();
      writeEnvironmentConfig(saved);
      print("");
      print(`Configuration saved. Run "rule configure --list" to review.`);

      return;
    }

    const key = keys[index];
    const meta = RULE_MCP_VARS[key];
    const current = saved[key] || "";
    readline.question(`${key} (${meta.desc}) [${current}]: `, (answer) => {
      if (answer.trim()) {
        saved[key] = answer.trim();
      }

      index++;
      ask();
    });
  };
  ask();
}

/**
 * Run system health check and print JSON report.
 * Pass telemetry=true for anonymous usage stats (opt-in).
 */
export async function doctorCommand(options = {}) {
  await loadAllSkills();
  const telemetry = typeof options === "boolean" ? options : !!options.telemetry;
  const isJson = typeof options === "object" && !!options.json;
  const jsonOut = typeof options === "object" ? options.jsonOut : undefined;
  const report = await runDoctor(telemetry);

  if (jsonOut) {
    writeFileSync(resolve(jsonOut), JSON.stringify(report, null, 2) + "\n");
  }

  if (isJson) {
    printJson(report);

    return;
  }

  print(formatDoctorTerminal(report));

  if (jsonOut) {
    print(`JSON exported to ${resolve(jsonOut)}`);
  }
}

/**
 * Reload skills from disk (force flush the cache).
 */
export async function skillsReloadCommand() {
  await loadAllSkills(true);
  print("Skills reloaded");
}

/**
 * Force a self-update from the upstream git repo (fast-forward only).
 * Prints a human-readable report.
 */
export async function updateCommand() {
  const { runSelfUpdate, buildBanner, scheduleRestartIfNeeded } = await import("../core/self-update.js");
  const result = await runSelfUpdate({ reloadSkills: false });
  const banner = buildBanner(result);

  if (banner) {
    print(banner);
  } else if (result.updated === false && !result.skipped) {
    print("✅ Already up to date.");
  }

  if (result.skipped) {
    print(`Skipped: ${result.reason}${result.note ? ` - ${result.note}` : ""}`);
  }

  const restart = scheduleRestartIfNeeded(result, () => {});

  if (restart) {
    print(restart);
  }
}

/**
 * Validate and auto-fix project file tree structure.
 * Delegates to the pix_fix MCP tool.
 *
 * @param {{ dir?: string, srcDir?: string, mode?: string, dryRun?: boolean }} opts
 */
export async function fixCommand(opts = {}) {
  await loadAllSkills();
  const result = await callTool("pix_fix", {
    path: opts.dir || ".",
    srcDir: opts.srcDir || "src",
    mode: opts.mode || "lint",
    dryRun: opts.dryRun !== false,
  });
  print(result.content[0].text);
}

/**
 * Generate shell completion script.
 *
 * @param {{ shell?: string }} opts
 */
export function completionsCommand(opts = {}) {
  const shell = opts.shell || "zsh";
  const script = generateCompletions(shell);
  print(script);
}

export { skillsInstallCommand, skillsListCommand } from "./skills-install.js";

/**
 * Resolve the command-file directories for this machine - the single answer to
 * "where do the bare `/rule-*` commands have to be written?".
 *
 * @param {{ agent?: string }} opts
 */
function resolvedTargets(opts) {
  return resolveCommandTargets(opts.agent ? { agent: opts.agent } : { detectedOnly: true });
}

/**
 * Print the resolved command targets - `agent<TAB>format<TAB>scope<TAB>dir`, or
 * JSON with `--json`. Installer/uninstaller scripts consume this so they can
 * never drift from the registry.
 *
 * @param {{ agent?: string, json?: boolean }} opts
 */
function printCommandTargets(opts) {
  const targets = resolvedTargets(opts);

  if (opts.json) {
    print(JSON.stringify(targets, null, 2));

    return;
  }

  print(targets.map((t) => [t.agent, t.format, t.scope, t.dir].join("\t")).join("\n"));
}

/**
 * Write (or remove with `--remove`) the whole clean command set in every resolved
 * target directory, so a single call covers every agent/IDE on this machine.
 *
 * @param {{ agent?: string, remove?: boolean, dryRun?: boolean, json?: boolean }} opts
 */
function syncCommandTargets(opts) {
  const targets = resolvedTargets(opts);

  if (targets.length === 0) {
    print("agent-commands: no agent command directories found on this machine");

    return;
  }

  let files = 0;

  for (const { label, format, dir } of targets) {
    const rendered = renderAgentCommandFiles(format);

    if (!opts.dryRun && !opts.remove) {
      mkdirSync(dir, { recursive: true });
    }

    // Remove sweeps the whole `rule-*` namespace in the target dir, so names
    // that left the registry (a rename, a deletion) are purged too instead of
    // lingering as stale commands next to the new set.
    if (opts.remove) {
      const stale = readdirSync(dir)
        .filter((entry) => entry.startsWith("rule-"))
        .filter((entry) => entry.endsWith(".md") || entry.endsWith(".toml") || entry.endsWith(".prompt.md"));

      for (const entry of stale) {
        const file = resolve(dir, entry);

        if (!opts.dryRun) {
          rmSync(file, { force: true });
        }
      }

      files += stale.length;
      print(`  ${opts.dryRun ? "[dry-run] " : ""}${label}: removed ${stale.length} rule* command file(s) → ${dir}`);
      continue;
    }

    for (const { filename, content } of rendered) {
      const file = resolve(dir, filename);

      if (!opts.dryRun) {
        writeFileSync(file, content);
      }

      files += 1;
    }

    print(`  ${label}: wrote ${rendered.length} ${format} command file(s) → ${dir}`);
  }

  print(
    `agent-commands: ${opts.remove ? "removed" : "synced"} ${files} file(s) across ${targets.length} directory(ies)`,
  );
}

/**
 * Generate (or remove) the clean `/rule-*` agent slash-command files for one
 * agent directory. Registry-driven (see {@link module:core/agent-commands}) so
 * the same ordered set is written for every agent.
 *
 * @param {{ dir?: string, format?: string, remove?: boolean, list?: boolean, force?: boolean, dryRun?: boolean }} opts
 */
export function agentCommandsCommand(opts = {}) {
  if (opts.list) {
    print(commandNames().join("\n"));

    return;
  }

  if (opts.targets) {
    printCommandTargets(opts);

    return;
  }

  if (opts.sync) {
    syncCommandTargets(opts);

    return;
  }

  const format = opts.format || "args";

  if (!FORMAT_EXT[format]) {
    throw new Error(`Unknown --format "${format}". Use one of: ${Object.keys(FORMAT_EXT).join(", ")}.`);
  }

  if (!opts.dir) {
    throw new Error("agent-commands requires --dir <dir> (or --list).");
  }

  const dir = resolve(opts.dir);
  const files = renderAgentCommandFiles(format);

  let written = 0;
  let skipped = 0;
  let removed = 0;

  if (opts.remove) {
    for (const { filename } of files) {
      const file = resolve(dir, filename);

      if (existsSync(file)) {
        if (!opts.dryRun) {
          rmSync(file, { force: true });
        }

        removed += 1;
      }
    }

    print(`agent-commands: removed ${removed} file(s) from ${dir}`);

    return;
  }

  if (!opts.dryRun) {
    mkdirSync(dir, { recursive: true });
  }

  for (const { filename, content } of files) {
    const file = resolve(dir, filename);

    if (existsSync(file) && !opts.force) {
      skipped += 1;
      continue;
    }

    if (!opts.dryRun) {
      writeFileSync(file, content);
    }

    written += 1;
  }

  print(`agent-commands: wrote ${written}, skipped ${skipped} (${format}) → ${dir}`);
}
