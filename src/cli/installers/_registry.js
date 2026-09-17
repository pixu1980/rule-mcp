

/**
 * Installer registry: maps agent id -> install/uninstall implementation and
 * the deprecated-name redirect table.
 * @module cli/installers/registry
 */

import { join } from "node:path";
import { HOME } from "./_paths.js";
import { installClaude, installCodex, installCursor, installCopilot, installGemini, installPi } from "./_agents-cli.js";
import { installOpencode } from "./_agents-opencode.js";
import { installVscode, installJetbrains, installNeovim, installEmacs, installDevin, createGenericInstaller } from "./_agents-ide.js";

const deprecatedAgents = new Map([["windsurf", "devin"]]);

const installers = {
  // Coding Agents
  claude: installClaude,
  codex: installCodex,
  cursor: installCursor,
  copilot: installCopilot,
  gemini: installGemini,
  pi: installPi,
  // opencode reads a JSON config file of its own shape, not the mcpServers one.
  opencode: installOpencode,

  // Generic JSON config agents
  cline: createGenericInstaller("cline"),
  roo: createGenericInstaller("roo"),
  zed: createGenericInstaller("zed"),
  antigravity: createGenericInstaller("antigravity"),
  kilo: createGenericInstaller("kilo"),
  kimi: createGenericInstaller("kimi"),
  vibe: createGenericInstaller("vibe"),
  grok: createGenericInstaller("grok"),
  droid: createGenericInstaller("droid", { configPath: join(HOME, ".config", "factory", "mcp.json") }),
  kiro: createGenericInstaller("kiro"),
  qwen: createGenericInstaller("qwen"),
  // Devin reads ~/.config/devin/mcp_config.json (%APPDATA%\devin on Windows)
  // and uses the standard mcpServers shape; it documents no global
  // instructions file, so none is written.
  devin: installDevin,

  // IDEs
  vscode: installVscode,
  jetbrains: installJetbrains,
  neovim: installNeovim,
  emacs: installEmacs,
};

export { deprecatedAgents, installers };
