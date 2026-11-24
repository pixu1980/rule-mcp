/** The MCP server entry each host writes: stdio launcher or SSE URL, with the switches attached. */

import { homedir } from "node:os";

import { normalizeInstallMode } from "./_catalog.js";
import { DEFAULT_SSE_PORT } from "../paths/index.js";
import { getOrCreateSseBearerToken } from "../../transport/index.js";
import { resolveEnvironment } from "./_env.js";
import { resolveGlobalBinary, serverName } from "./_paths.js";

const commandConfig = (entrypoint, options = {}) => {
  const mode = normalizeInstallMode(options.mode);
  const environment = resolveEnvironment(options);
  // Only pi.dev coding agent supports directTools + lifecycle
  const isPi = options.agentName === "pi";

  if (mode === "daemon" || mode === "docker") {
    const port = Number.isInteger(options.port) && options.port > 0 && options.port < 65_536 ? options.port : DEFAULT_SSE_PORT;
    const token = getOrCreateSseBearerToken();
    const config = {
      url: `http://127.0.0.1:${port}/sse`,
      headers: { Authorization: `Bearer ${token}` },
    };
    if (isPi) {
      config.directTools = true;
      config.lifecycle = "keep-alive";
      // Bare per-server tool naming: tools become `rule-mcp-tool-*` and prompts
      // `/rule-mcp-*` instead of the `mcp__rule_mcp__*` prefix form.
      config.toolPrefix = "none";
    }

    return config;
  }

  // Build stdio config
  let config;
  const globalBin = resolveGlobalBinary();

  if (globalBin) {
    const home = homedir();
    config = { command: globalBin, args: ["serve"], type: "stdio" };
  } else {
    config = { command: process.execPath, args: [entrypoint, "serve"] };
  }

  if (isPi) {
    config.directTools = true;
    config.lifecycle = "keep-alive";
    // Same clean naming as the daemon branch: bare `rule-mcp-tool-*` tools and
    // `/rule-mcp-*` prompts instead of `mcp__rule_mcp__*`.
    config.toolPrefix = "none";
  }

  // Attach env vars if any (supported by MCP stdio transport)
  if (Object.keys(environment).length > 0) {
    config.env = environment;
  }

  return config;
};

function mcpServerConfig(entrypoint, opts = {}) {
  return { [serverName]: commandConfig(entrypoint, opts) };
}

/**
 * The launcher a hook line runs. It mirrors the stdio config the agent gets -
 * the global shim when one is on PATH, node plus the entrypoint otherwise - but
 * without `serve`: a hook appends `guard <action>`, and `serve guard <action>`
 * fails with "too many arguments for 'serve'".
 *
 * @param {string} entrypoint
 * @returns {{ command: string, args?: string[] }}
 */
function hookLauncher(entrypoint) {
  const config = commandConfig(entrypoint);

  return config.command === process.execPath ? { command: config.command, args: [entrypoint] } : { command: config.command };
}

export { commandConfig, hookLauncher, mcpServerConfig };
