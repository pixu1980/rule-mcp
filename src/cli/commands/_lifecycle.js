/** Install and uninstall commands (agent catalog + service). */

import { entrypoint, print, printJson } from "./_shared.js";
import { formatInstallResult, formatUninstallResult } from "../_tui-formats.js";
import { installAgent } from "../install/index.js";
import { uninstallFromAgent } from "../_uninstall.js";
function installCommand(opts) {
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
function uninstallCommand(opts) {
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

export { installCommand, uninstallCommand };
