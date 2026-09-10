

/** Render the daemon status block for the CLI. */
import { getRuntimePaths } from "../paths/index.js";
import { checkDaemonService } from "./_service-status.js";

/**
 * Get a human-readable summary of the daemon status for CLI output.
 *
 * @returns {string}
 */
export function formatDaemonStatus() {
  const status = checkDaemonService();
  const p = getRuntimePaths();

  const lines = [
    `Platform:   ${status.platform}`,
    `Service:    ${status.service}`,
    `Installed:  ${status.installed ? "✓" : "✗"}`,
    `Loaded:     ${status.loaded ? "✓" : "✗"}`,
    `Running:    ${status.running ? "✓" : "✗"}`,
  ];

  if (status.pid) {
    lines.push(`PID:        ${status.pid}`);
  }

  // Add native-specific details
  if (status.platform === "macos" && status.details.launchAgent) {
    lines.push(`Plist:      ${status.details.launchAgent.path}`);
  }

  if (status.platform === "linux" && status.details.systemd) {
    lines.push(`Unit:       ${status.details.systemd.path}`);
  }

  if (status.platform === "windows" && status.details.windowsService) {
    lines.push(`Service:    ${status.details.windowsService.name}`);
  }

  lines.push(`PID file:   ${p.pidFile}`, `Log file:   ${p.logFile}`);

  return lines.join("\n");
}
