import {
  resolveEntrypoint,
  LAUNCH_AGENT_LABEL,
  LAUNCH_AGENT_PATH,
  SYSTEMD_UNIT_NAME,
  SYSTEMD_UNIT_PATH,
  WINDOWS_SERVICE_NAME,
  installLaunchAgent,
  uninstallLaunchAgent,
  checkLaunchAgent,
  installSystemdService,
  uninstallSystemdService,
  checkSystemdService,
  installWindowsService,
  uninstallWindowsService,
  checkWindowsService,
} from "./daemon-platform.js";

export * from "./daemon-platform.js";

/**
 * @module cli/daemon
 *
 * Platform-specific daemon/service management for rule-mcp.
 *
 * Supports three operating systems:
 *   - **macOS**:  LaunchAgent plist in ~/Library/LaunchAgents/ via launchctl
 *   - **Linux**:  systemd user service in ~/.config/systemd/user/ via systemctl --user
 *   - **Windows**: Windows service via sc.exe with PowerShell fallback
 *
 * The "process" daemon (spawned child process) from the original implementation
 * is kept as a fallback for environments without a proper init system.
 *
 * Usage:
 *   import { installDaemonService, uninstallDaemonService, checkDaemonService,
 *            startDaemonProcess, stopDaemonProcess, daemonProcessStatus,
 *            formatDaemonStatus, detectPlatform }
 *     from "./cli/daemon.js";
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  appendFileSync,
  statSync,
  renameSync,
} from "node:fs";
import { platform } from "node:os";
import { getRuntimePaths } from "./paths.js";

// ─── Platform detection ───────────────────────────────────────────────────

const IS_MACOS = platform() === "darwin";
const IS_LINUX = platform() === "linux";
const IS_WINDOWS = platform() === "win32";

/**
 * Detect the current OS platform name.
 * @returns {"macos" | "linux" | "windows" | "unknown"}
 */
export function detectPlatform() {
  if (IS_MACOS) {
    return "macos";
  }

  if (IS_LINUX) {
    return "linux";
  }

  if (IS_WINDOWS) {
    return "windows";
  }

  return "unknown";
}

// ─── Entry-point resolution ───────────────────────────────────────────────

/**
 * Resolve the absolute path to the server entry script.
 * Used by all service templates so the daemon knows what to run.
 *
 * @returns {{ node: string, script: string, command: string[] }}
 */

/** Escape a string for use in a plist <string> element. */

/** Rotate the daemon log once it grows past 5 MB (logs.1 keeps the previous run). */
const LOG_ROTATE_BYTES = 5 * 1024 * 1024;
function rotateDaemonLog(logFile) {
  try {
    if (existsSync(logFile) && statSync(logFile).size > LOG_ROTATE_BYTES) {
      rmSync(logFile + ".1", { force: true });
      renameSync(logFile, logFile + ".1");
    }
  } catch {
    /* rotation best-effort */
  }
}

/**
 * Spawn the resident daemon process.
 *
 * @param {{ dryRun?: boolean }} [opts]
 */
export function startDaemonProcess({ dryRun = false } = {}) {
  const p = getRuntimePaths();
  mkdirSync(p.stateDir, { recursive: true });

  // Check existing PID
  if (existsSync(p.pidFile)) {
    const pid = Number(readFileSync(p.pidFile, "utf8").trim());
    try {
      process.kill(pid, 0);

      return { ok: true, pid, action: "already-running" };
    } catch {
      rmSync(p.pidFile, { force: true });
    }
  }

  if (dryRun) {
    return { ok: true, pid: null, action: "dry-run (would spawn daemon)" };
  }

  rotateDaemonLog(p.logFile);

  const ep = resolveEntrypoint();
  const child = spawn(ep.node, ep.command.slice(1), {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, RULE_MCP_DAEMON: "1" },
  });

  // Capture output to log file
  if (child.stdout) {
    child.stdout.on("data", (data) => {
      try {
        appendFileSync(p.logFile, data.toString());
      } catch {
        /* log Error */
      }
    });
  }

  if (child.stderr) {
    child.stderr.on("data", (data) => {
      try {
        appendFileSync(p.logFile, "[stderr] " + data.toString());
      } catch {
        /* log Error */
      }
    });
  }

  child.unref();
  writeFileSync(p.pidFile, String(child.pid));

  return { ok: true, pid: child.pid, action: "started" };
}

/**
 * Stop the background daemon process.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, action: string }}
 */
export function stopDaemonProcess({ dryRun = false } = {}) {
  const p = getRuntimePaths();

  if (!existsSync(p.pidFile)) {
    return { ok: true, action: "not-running" };
  }

  if (dryRun) {
    return { ok: true, action: "dry-run (would stop daemon)" };
  }

  const pid = Number(readFileSync(p.pidFile, "utf8").trim());
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* ok */
  }

  rmSync(p.pidFile, { force: true });

  return { ok: true, action: "stopped" };
}

/**
 * Check the status of the process-based daemon.
 *
 * @returns {{ running: boolean, pid: number|null, stalePid: number|null, pidFile: string, logFile: string }}
 */
export function daemonProcessStatus() {
  const p = getRuntimePaths();
  const result = { running: false, pid: null, stalePid: null, pidFile: p.pidFile, logFile: p.logFile };

  if (!existsSync(p.pidFile)) {
    return result;
  }

  const pid = Number(readFileSync(p.pidFile, "utf8").trim());
  try {
    process.kill(pid, 0);
    result.running = true;
    result.pid = pid;
  } catch {
    result.stalePid = pid;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Unified public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Install the platform-native daemon service.
 *
 * On macOS, creates a LaunchAgent plist and loads it via launchctl.
 * On Linux, creates a systemd user service and enables/starts it.
 * On Windows, creates a Windows service via sc.exe or New-Service.
 *
 * After installation on macOS, the daemon appears in
 * System Settings → General → Login Items & Extensions.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, platform: string, service: string, result: object }}
 */
export function installDaemonService({ dryRun = false } = {}) {
  const platform = detectPlatform();

  switch (platform) {
    case "macos": {
      return { ok: true, platform, service: "launchd", result: installLaunchAgent({ dryRun }) };
    }
    case "linux": {
      return { ok: true, platform, service: "systemd", result: installSystemdService({ dryRun }) };
    }
    case "windows": {
      return { ok: true, platform, service: "windows-service", result: installWindowsService({ dryRun }) };
    }
    default: {
      // Fallback: start process-based daemon
      const proc = startDaemonProcess({ dryRun });

      return { ok: proc.ok, platform: "unknown", service: "process", result: proc };
    }
  }
}

/**
 * Uninstall the platform-native daemon service.
 *
 * On macOS, unloads and removes the LaunchAgent plist.
 * On Linux, stops, disables, and removes the systemd unit.
 * On Windows, stops and deletes the service.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, platform: string, service: string, result: object }}
 */
export function uninstallDaemonService({ dryRun = false } = {}) {
  const platform = detectPlatform();

  switch (platform) {
    case "macos": {
      return { ok: true, platform, service: "launchd", result: uninstallLaunchAgent({ dryRun }) };
    }
    case "linux": {
      return { ok: true, platform, service: "systemd", result: uninstallSystemdService({ dryRun }) };
    }
    case "windows": {
      return { ok: true, platform, service: "windows-service", result: uninstallWindowsService({ dryRun }) };
    }
    default: {
      // Fallback: stop process-based daemon
      const proc = stopDaemonProcess({ dryRun });

      return { ok: proc.ok, platform: "unknown", service: "process", result: proc };
    }
  }
}

/**
 * Check the status of the platform-native daemon service.
 * Falls back to process-based daemon check if no native service is installed.
 *
 * @returns {{
 *   platform: string,
 *   service: string,
 *   installed: boolean,
 *   loaded: boolean,
 *   running: boolean,
 *   pid: number|null,
 *   details: object
 * }}
 */
export function checkDaemonService() {
  const platform = detectPlatform();
  const processStatus = daemonProcessStatus();

  switch (platform) {
    case "macos": {
      const ls = checkLaunchAgent();

      return {
        platform,
        service: "launchd",
        installed: ls.installed,
        loaded: ls.loaded,
        running: ls.loaded && ls.pid !== null,
        pid: ls.pid || processStatus.pid,
        details: { launchAgent: ls, process: processStatus },
      };
    }
    case "linux": {
      const sd = checkSystemdService();

      return {
        platform,
        service: "systemd",
        installed: sd.installed,
        loaded: sd.enabled,
        running: sd.active,
        pid: sd.pid || processStatus.pid,
        details: { systemd: sd, process: processStatus },
      };
    }
    case "windows": {
      const ws = checkWindowsService();

      return {
        platform,
        service: "windows-service",
        installed: ws.installed,
        loaded: ws.installed,
        running: ws.running,
        pid: ws.pid || processStatus.pid,
        details: { windowsService: ws, process: processStatus },
      };
    }
    default: {
      return {
        platform: "unknown",
        service: "process",
        installed: processStatus.running,
        loaded: processStatus.running,
        running: processStatus.running,
        pid: processStatus.pid,
        details: { process: processStatus },
      };
    }
  }
}

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

/**
 * Get the native service file path for the current platform.
 * Useful for `daemon enable/disable` commands.
 *
 * @returns {string|null}
 */
export function getServiceFilePath() {
  const platform = detectPlatform();

  switch (platform) {
    case "macos": {
      return LAUNCH_AGENT_PATH;
    }
    case "linux": {
      return SYSTEMD_UNIT_PATH;
    }
    default: {
      return null;
    }
  }
}

/**
 * Get the native service name/label for the current platform.
 *
 * @returns {string|null}
 */
export function getServiceName() {
  const platform = detectPlatform();

  switch (platform) {
    case "macos": {
      return LAUNCH_AGENT_LABEL;
    }
    case "linux": {
      return SYSTEMD_UNIT_NAME;
    }
    case "windows": {
      return WINDOWS_SERVICE_NAME;
    }
    default: {
      return null;
    }
  }
}
