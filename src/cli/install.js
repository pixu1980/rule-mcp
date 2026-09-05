/**
 * @module cli/install
 *
 * Agent/IDE/model installation support for rule-mcp.
 * Generates MCP configuration files for ALL supported coding agents.
 *
 * Inspired by tokensave's architecture:
 *   18+ agents with individual install/uninstall/healthcheck per agent.
 *   Shared utilities for JSON/TOML file manipulation with atomic writes + backups.
 *   Cross-platform paths for macOS, Linux, Windows.
 *
 * Supported agents (matching tokensave's full list):
 *   claude, codex, cursor, copilot, gemini,
 *   cline, roo, zed, opencode, antigravity, windsurf,
 *   kilo, kimi, vibe, grok, droid, kiro, qwen,
 *   pi, vscode, jetbrains, neovim, emacs
 *
 * Verification tiers (honesty matters for a compatibility surface this wide):
 *   - stdio: universally tested - works with every MCP host. Default, preferred.
 *   - daemon / HTTP+SSE: interop-verified end-to-end only for `pi` and `vscode`
 *     (see remoteModeAgents). Other agents get a correct-shape `mcpServers` config
 *     that is NOT individually interop-tested and may need a manual tweak.
 *
 * Supports stdio, native daemon/SSE, and Docker deployment modes.
 * Stdio can use a local Node entrypoint or a globally installed command.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { platform } from "node:os";
import {
  serverName,
  allAgents,
  HOME,
  normalizeInstallMode,
  remoteModeAgents,
  installers,
  uninstallers,
  vscodeGlobalDir,
} from "./agent-installers.js";

export * from "./agent-installers.js";

function writeInstalledManifest(agents, entrypoint, global, mode) {
  const stateDir = join(HOME, ".local", "share", "rule-mcp");
  mkdirSync(stateDir, { recursive: true });
  const manifestPath = join(stateDir, "installed.md");
  const timestamp = new Date().toISOString();
  const lines = [
    "# rule-mcp - Installation Manifest",
    "",
    `Generated: ${timestamp}`,
    `Install source: ${global ? "global" : "local"}`,
    `Transport: ${mode}`,
    `Entry point: ${entrypoint}`,
    `Node version: ${process.version}`,
    `Platform: ${platform()}`,
    "",
    "## Installed Agents",
    "",
  ];

  for (const name of agents) {
    lines.push(`- [x] ${name}`);
  }

  lines.push("", "---", "", `To reinstall: \`rule-mcp install --agent all --mode ${mode}\``);
  writeFileSync(manifestPath, lines.join("\n") + "\n");

  return manifestPath;
}

/**
 * Install rule-mcp into one or more agents.
 * Writes an installed.md manifest after successful installation.
 *
 * @param {{ agent: string, entrypoint: string, dryRun?: boolean, force?: boolean, global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker" }} opts
 * @returns {{ ok: boolean, dryRun: boolean, global: boolean, installed: object, manifest?: string }}
 */
export const installAgent = ({
  agent,
  entrypoint,
  dryRun = false,
  force = false,
  global = false,
  mode = "stdio",
  _env = {},
}) => {
  const normalizedMode = normalizeInstallMode(mode);
  const selected = agent === "all" ? allAgents : [agent];

  if (!installers[agent] && agent !== "all") {
    throw new Error(`Unsupported agent: "${agent}". Supported agents: ${allAgents.join(", ")}`);
  }

  const result = {};

  for (const name of selected) {
    if (!installers[name]) {
      result[name] = { error: `No installer for "${name}"` };
      continue;
    }

    if (normalizedMode !== "stdio" && !remoteModeAgents.has(name)) {
      result[name] = {
        error: `Install mode "${normalizedMode}" is currently supported only for Pi and VS Code; use stdio for ${name}.`,
      };
      continue;
    }

    try {
      result[name] = installers[name]({ entrypoint, dryRun, global, force, mode: normalizedMode });
    } catch (error) {
      result[name] = { error: error.message };
    }
  }

  const ok = Object.values(result).every((entry) => !entry?.error);

  if (!dryRun) {
    const manifestPath = writeInstalledManifest(selected, entrypoint, global, normalizedMode);

    return { ok, dryRun, global, mode: normalizedMode, installed: result, manifest: manifestPath };
  }

  return { ok, dryRun, global, mode: normalizedMode, installed: result };
};

// ─── Uninstallers ───────────────────────────────────────────────────────────

/**
 * Remove this server's install from one agent.
 *
 * @param {{ agent: string, dryRun?: boolean }} args
 */
export const uninstallAgent = ({ agent, dryRun = false }) => {
  const selected = agent === "all" ? allAgents : [agent];

  if (!uninstallers[agent] && agent !== "all") {
    throw new Error(`Unsupported agent: "${agent}". Supported agents: ${allAgents.join(", ")}`);
  }

  const result = {};

  for (const name of selected) {
    if (!uninstallers[name]) {
      result[name] = { error: `No uninstaller for "${name}"` };
      continue;
    }

    try {
      result[name] = uninstallers[name]({ dryRun });
    } catch (error) {
      result[name] = { error: error.message };
    }
  }

  return { ok: true, dryRun, uninstalled: result };
};

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
    "windsurf",
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
