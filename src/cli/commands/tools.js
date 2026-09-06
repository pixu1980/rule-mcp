// Auto-split from src/cli/commands/index.js - see ./commands/index.js
/** Tools/config commands: list+call tools, env config and the interactive configure flow. */

import { callTool, listTools } from "../../tools/router/index.js";
import { entrypoint, parseJson, print, printJson } from "./shared.js";
import { formatToolsList } from "../tui.js";
import { loadAllSkills } from "../../core/skills.js";
import {
  mcpServerConfig,
  readEnvConfig as readEnvironmentConfig,
  writeEnvConfig as writeEnvironmentConfig,
} from "../install.js";
async function toolsCommand(opts) {
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
function configCommand(opts = {}) {
  print(JSON.stringify(mcpServerConfig(entrypoint, { global: opts.global, mode: opts.mode }), null, 2));
}

/**
 * Configure RULE_MCP_* environment variables for the MCP server.
 * Interactive prompts if no --set arguments provided.
 *
 * @param {{ set?: string[], list?: boolean, unset?: string }} opts
 */
async function configureCommand(opts = {}) {
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

  // Interactive mode: @clack/prompts (esc = cancel and save nothing).
  // Non-TTY shells cannot drive prompts, so they are told the flag form
  // instead of being left in a broken raw-mode state.
  if (!process.stdin.isTTY) {
    print("Non-interactive shell: pass --set KEY=VALUE (or --list / --unset).");

    return;
  }

  const { text, isCancel, cancel, intro, outro } = await import("@clack/prompts");
  intro("Configure RULE_MCP_* environment variables (leave empty to skip)");
  const saved = readEnvironmentConfig();

  for (const [key, meta] of Object.entries(RULE_MCP_VARS)) {
    const answer = await text({
      message: `${key} - ${meta.desc}`,
      placeholder: saved[key] || "skip",
    });

    if (isCancel(answer)) {
      cancel("Configuration aborted - nothing saved.");
      process.exitCode = 1;

      return;
    }

    if (answer.trim()) {
      saved[key] = answer.trim();
    }
  }

  writeEnvironmentConfig(saved);
  outro(`Saved ${Object.keys(RULE_MCP_VARS).length} variable(s). Run 'rule-mcp config env --list' to review.`);
}

/**
 * Run system health check and print JSON report.
 * Pass telemetry=true for anonymous usage stats (opt-in).
 */

export { toolsCommand, configCommand, configureCommand };
