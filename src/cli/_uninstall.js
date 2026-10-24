/**
 * @module cli/uninstall
 *
 * Agent/IDE uninstallation support for rule-mcp.
 * Removes MCP configuration entries from all supported coding agent configs.
 *
 * This is the inverse of the install logic in install.js.
 * Supports 23 agents: claude, codex, cursor, copilot, gemini,
 * cline, roo, zed, opencode, antigravity, devin,
 * kilo, kimi, vibe, grok, droid, kiro, qwen,
 * pi, vscode, jetbrains, neovim, emacs.
 *
 * @see module:cli/install for the install counterparts
 */

import { uninstallAgent } from "./install/index.js";

/**
 * Uninstall rule-mcp from one or more agents.
 * Delegates to the uninstall logic in install.js.
 *
 * @param {{ agent: string, dryRun?: boolean }} opts
 * @returns {{ ok: boolean, dryRun: boolean, note: string, agents: string[], uninstalled: object }}
 */
export function uninstallFromAgent({ agent, dryRun = false }) {
  const result = uninstallAgent({ agent, dryRun });

  return {
    ok: result.ok,
    dryRun: result.dryRun,
    note: `Removed rule-mcp from ${agent === "all" ? "all detected agents" : agent}.`,
    agents: Object.keys(result.uninstalled),
    uninstalled: result.uninstalled,
  };
}
