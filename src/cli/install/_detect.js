/** @module cli/install/detect - which agents are present on this machine */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { serverName, allAgents, HOME, vscodeGlobalDir } from "../installers/index.js";

export * from "../installers/index.js";

/**
 * Detect which agents have rule-mcp configured.
 * Checks common config file locations for the MCP server entry.
 *
 * @returns {Array<{ name: string, configured: boolean, configFile: string|null }>}
 */
export function detectInstalledAgents() {
  const checks = [
    { name: "claude", path: join(HOME, ".claude.json"), key: serverName },
    { name: "codex", path: join(HOME, ".codex", "config.toml"), key: serverName },
    { name: "cursor", path: join(HOME, ".cursor", "mcp.json"), key: serverName },
    { name: "copilot", path: join(HOME, ".config", "github-copilot", "hosts.json"), key: `copilot-mcp-${serverName}` },
    { name: "gemini", path: join(HOME, ".gemini", "settings.json"), key: serverName },
    { name: "pi", path: join(HOME, ".pi", "agent", "mcp.json"), key: serverName },
    { name: "vscode", path: join(vscodeGlobalDir(), "mcp.json"), key: serverName },
    { name: "jetbrains", path: join(process.cwd(), ".idea", "mcp.json"), key: serverName },
  ];

  // Generic ~/.config/<name>/mcp.json agents
  const genericAgents = [
    "cline",
    "roo",
    "zed",
    "opencode",
    "antigravity",
    "kilo",
    "kimi",
    "vibe",
    "grok",
    "droid",
    "kiro",
    "qwen",
    "neovim",
    "emacs",
  ];

  // Devin reads mcp_config.json, not the generic mcp.json.
  checks.push({ name: "devin", path: join(HOME, ".config", "devin", "mcp_config.json"), key: serverName });

  for (const name of genericAgents) {
    const agentPath =
      name === "droid" ? join(HOME, ".config", "factory", "mcp.json") : join(HOME, ".config", name, "mcp.json");
    checks.push({ name, path: agentPath, key: serverName });
  }

  return checks.map(({ name, path, key }) => {
    if (!existsSync(path)) {
      return { name, configured: false, configFile: null };
    }

    try {
      const content = readFileSync(path, "utf8");
      const configured = key ? content.includes(key) : content.includes(serverName);

      return { name, configured, configFile: path };
    } catch {
      return { name, configured: false, configFile: path };
    }
  });
}

/**
 * Get all supported agent names.
 * @returns {string[]}
 */
export function getAllAgents() {
  return [...allAgents];
}
