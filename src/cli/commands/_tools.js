

/** Tools/config commands: list+call tools, env config and the interactive configure flow. */

import { callTool, listTools } from "../../tools/router/index.js";
import { entrypoint, parseJson, print, printJson } from "./_shared.js";
import { formatToolsList } from "../_tui-formats.js";
import { loadAllSkills } from "../../core/skills/index.js";
import { mcpServerConfig } from "../install/index.js";
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

export { toolsCommand, configCommand };
