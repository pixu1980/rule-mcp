

/**
 * @module cli/setup/next-steps
 *
 * The closing "what to run now" lines.
 *
 * Mode-aware: telling a stdio user to check `daemon status` is noise, and
 * the daemon user is the only one who needs to know where the service shows
 * up in their OS.
 */

import { platform } from "node:os";

/** Lines for a finished install. */
export function installNextSteps({ mode, dryRun }) {
  if (dryRun) {
    return ["Nothing was written. Run the wizard again without dry run to apply it.", "rule-mcp setup"];
  }

  const lines = [
    "Restart your coding agent so it picks up the new MCP entry.",
    "rule-mcp doctor - re-run the health check",
    "rule-mcp config - print the mcp.json snippet",
  ];

  if (mode === "daemon") {
    lines.push(
      "rule-mcp daemon status - check the background service",
      platform() === "darwin" ? "System Settings > General > Login Items - the LaunchAgent appears here" : "systemctl --user status rule-mcp - the unit appears here",
    );
  }

  if (mode === "docker") {
    lines.push("docker compose ps - check the container");
  }

  return lines;
}

/** Lines for a finished uninstall. */
export function uninstallNextSteps({ dryRun, purged }) {
  if (dryRun) {
    return ["Nothing was removed. Run the wizard again without dry run to apply it.", "rule-mcp setup --uninstall"];
  }

  const lines = ["Restart your coding agent so it drops the removed MCP entry.", "The project files in this directory were not deleted."];

  if (!purged) {
    lines.push("State and config were kept - re-run and tick purge to delete them.");
  }

  lines.push("curl -fsSL https://raw.githubusercontent.com/pixu1980/rule-mcp/v0.1.0-beta/scripts/install.sh | bash - to reinstall");

  return lines;
}
