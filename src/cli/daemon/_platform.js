// Auto-extracted from src/cli/daemon.js - platform-specific service writers.
// Kept self-contained; daemon.js re-exports these for historical imports.

import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { getRuntimePaths } from "../paths.js";

const HOME = homedir();

function resolveEntrypoint() {
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const scriptPath = join(__dirname, "..", "..", "bin", "rule-mcp.js");
  const nodePath = process.execPath;

  return {
    node: nodePath,
    script: scriptPath,
    command: [nodePath, scriptPath, "serve", "--transport", "sse"],
  };
}

function escapePlist(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Safely run a shell command, ignoring errors. */
function tryExec(command, options = {}) {
  try {
    return execSync(command, { encoding: "utf8", timeout: 10_000, stdio: "pipe", ...options });
  } catch {
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// macOS - LaunchAgent plist
// ═══════════════════════════════════════════════════════════════════════════

const LAUNCH_AGENT_LABEL = "io.github.rule.rule-mcp";
const LAUNCH_AGENT_DIR = join(HOME, "Library", "LaunchAgents");
const LAUNCH_AGENT_PATH = join(LAUNCH_AGENT_DIR, `${LAUNCH_AGENT_LABEL}.plist`);

/**
 * Path to the wrapper shell script that macOS shows in Login Items.
 * Using a wrapper script instead of calling Node.js directly ensures that
 * macOS displays "rule-mcpd" in Login Items rather than "Node.js Foundation".
 */
export const WRAPPER_SCRIPT_PATH = join(HOME, ".local", "bin", "rule-mcpd");

/**
 * Generate the wrapper shell script that the LaunchAgent runs.
 * Using a wrapper script instead of calling Node.js directly ensures that
 * macOS displays "rule-mcpd" in Login Items rather than "Node.js Foundation".
 *
 * @param {{ node: string, script: string }} ep
 * @returns {string} - shell script content
 */
export function generateWrapperScript(ep) {
  return `#!/usr/bin/env bash
# rule-mcp daemon wrapper
# This wrapper is called by the LaunchAgent so macOS shows
# "rule-mcpd" in Login Items instead of "Node.js Foundation".
set -euo pipefail

if [[ $# -gt 0 ]]; then
  exec ${escapePlist(ep.node)} ${escapePlist(ep.script)} "$@"
fi

export RULE_MCP_DAEMON=1
exec ${escapePlist(ep.node)} ${escapePlist(ep.script)} serve --transport sse
`;
}

/**
 * Generate the LaunchAgent plist XML.
 * Uses Program (wrapper script) instead of ProgramArguments with node directly,
 * so macOS shows "rule-mcpd" in Login Items.
 *
 * @param {{ node: string, script: string, command: string[] }} ep
 * @returns {string} - plist XML content
 */
function generateLaunchAgentPlist(_ep) {
  const p = getRuntimePaths();
  const logPath = p.logFile;
  mkdirSync(p.stateDir, { recursive: true });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>${LAUNCH_AGENT_LABEL}</string>

	<key>Program</key>
	<string>${escapePlist(WRAPPER_SCRIPT_PATH)}</string>

	<key>RunAtLoad</key>
	<true/>

	<key>KeepAlive</key>
	<true/>

	<key>StandardOutPath</key>
	<string>${escapePlist(logPath)}</string>

	<key>StandardErrorPath</key>
	<string>${escapePlist(logPath)}</string>

	<key>EnvironmentVariables</key>
	<dict>
		<key>RULE_MCP_DAEMON</key>
		<string>1</string>
		<key>PATH</key>
		<string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
	</dict>

	<key>WorkingDirectory</key>
	<string>${escapePlist(HOME)}</string>

	<key>ProcessType</key>
	<string>Background</string>

	<key>Nice</key>
	<integer>10</integer>
</dict>
</plist>
`;
}

/**
 * Install the macOS LaunchAgent plist and wrapper script, then load it.
 * After this, the daemon appears in System Settings → General → Login Items
 * as "rule-mcpd" (not "Node.js Foundation").
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, path: string, action: string, error?: string }}
 */
function installLaunchAgent({ dryRun = false } = {}) {
  const ep = resolveEntrypoint();

  if (dryRun) {
    return { ok: true, path: LAUNCH_AGENT_PATH, action: "dry-run (plist not written)" };
  }

  // Write wrapper script first (so the plist references something valid)
  mkdirSync(dirname(WRAPPER_SCRIPT_PATH), { recursive: true });
  writeFileSync(WRAPPER_SCRIPT_PATH, generateWrapperScript(ep), "utf8");
  tryExec(`chmod +x "${WRAPPER_SCRIPT_PATH}"`);

  // Write plist
  mkdirSync(LAUNCH_AGENT_DIR, { recursive: true });
  writeFileSync(LAUNCH_AGENT_PATH, generateLaunchAgentPlist(ep), "utf8");

  // Unload first if already loaded (to overwrite)
  tryExec(
    `launchctl unload -w "${LAUNCH_AGENT_PATH}" 2>/dev/null || launchctl remove ${LAUNCH_AGENT_LABEL} 2>/dev/null || true`,
  );

  // Load the new plist
  const out = tryExec(`launchctl load -w "${LAUNCH_AGENT_PATH}"`);

  if (out.includes("Error") || out.includes("error")) {
    return { ok: false, path: LAUNCH_AGENT_PATH, error: `launchctl load failed: ${out}` };
  }

  return { ok: true, path: LAUNCH_AGENT_PATH, action: "loaded" };
}

/**
 * Unload and remove the macOS LaunchAgent plist and wrapper script.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, path: string, action: string }}
 */
function uninstallLaunchAgent({ dryRun = false } = {}) {
  if (!existsSync(LAUNCH_AGENT_PATH)) {
    return { ok: true, path: LAUNCH_AGENT_PATH, action: "not-installed" };
  }

  if (dryRun) {
    return { ok: true, path: LAUNCH_AGENT_PATH, action: "dry-run (plist not removed)" };
  }

  // Unload first
  tryExec(
    `launchctl unload -w "${LAUNCH_AGENT_PATH}" 2>/dev/null || launchctl remove ${LAUNCH_AGENT_LABEL} 2>/dev/null || true`,
  );

  // Remove plist
  rmSync(LAUNCH_AGENT_PATH, { force: true });

  // Remove wrapper script
  if (existsSync(WRAPPER_SCRIPT_PATH)) {
    rmSync(WRAPPER_SCRIPT_PATH, { force: true });
  }

  return { ok: true, path: LAUNCH_AGENT_PATH, action: "unloaded-and-removed" };
}

/**
 * Check macOS LaunchAgent status.
 *
 * @returns {{ installed: boolean, loaded: boolean, pid: number|null, path: string }}
 */
function checkLaunchAgent() {
  const result = { installed: existsSync(LAUNCH_AGENT_PATH), loaded: false, pid: null, path: LAUNCH_AGENT_PATH };

  if (result.installed) {
    const out = tryExec(`launchctl list ${LAUNCH_AGENT_LABEL} 2>/dev/null || true`);

    if (out.includes(LAUNCH_AGENT_LABEL)) {
      result.loaded = true;
      // New macOS format (Ventura+): plist-style dict with "PID" = 12345;
      const newPidMatch = out.match(/"PID"\s*=\s*(\d+)/);

      if (newPidMatch) {
        const pid = parseInt(newPidMatch[1], 10);

        if (pid > 0) {
          result.pid = pid;
        }
      } else {
        // Alternative format: "PID\tStatus\tLabel"
        const oldPidMatch = out.match(/^(\d+)\t/m);

        if (oldPidMatch) {
          const pid = parseInt(oldPidMatch[1], 10);

          if (pid > 0) {
            result.pid = pid;
          }
        }
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Linux - systemd user service
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEMD_UNIT_NAME = "rule-mcp";
const SYSTEMD_USER_DIR = join(HOME, ".config", "systemd", "user");
const SYSTEMD_UNIT_PATH = join(SYSTEMD_USER_DIR, `${SYSTEMD_UNIT_NAME}.service`);

/**
 * Generate the systemd user service unit file.
 * @param {{ node: string, script: string, command: string[] }} ep
 * @returns {string} - systemd unit content
 */
function generateSystemdUnit(ep) {
  const p = getRuntimePaths();
  const logPath = p.logFile;

  mkdirSync(p.stateDir, { recursive: true });

  // Build a shell command string from the command array
  const command = ep.command.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ");

  // Extract node bin dir for PATH
  const nodeBinDir = ep.node.replace(/\/node$/, "");

  return `[Unit]
Description=rule-mcp MCP Server
Documentation=https://github.com/pixu1980/rule-mcp
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${command}
Restart=on-failure
RestartSec=5
RestartSteps=3
RestartMaxDelaySec=30
StartLimitBurst=5
StartLimitIntervalSec=60

Environment=RULE_MCP_DAEMON=1
Environment=PATH=/usr/local/bin:/usr/bin:/bin:${nodeBinDir}

StandardOutput=append:${logPath}
StandardError=append:${logPath}

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${p.stateDir}

[Install]
WantedBy=default.target
`;
}

/**
 * Install the systemd user service, enable and start it.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, path: string, action: string, error?: string }}
 */
function installSystemdService({ dryRun = false } = {}) {
  const ep = resolveEntrypoint();
  const content = generateSystemdUnit(ep);

  if (dryRun) {
    return { ok: true, path: SYSTEMD_UNIT_PATH, action: "dry-run (unit not written)" };
  }

  mkdirSync(SYSTEMD_USER_DIR, { recursive: true });
  writeFileSync(SYSTEMD_UNIT_PATH, content, "utf8");

  // Reload daemon, enable, start
  tryExec("systemctl --user daemon-reload");
  tryExec(`systemctl --user enable "${SYSTEMD_UNIT_NAME}"`);
  const out = tryExec(`systemctl --user restart "${SYSTEMD_UNIT_NAME}"`);

  // Check if it failed
  if (out.includes("Failed") || out.includes("failed")) {
    return { ok: false, path: SYSTEMD_UNIT_PATH, error: `systemctl restart failed: ${out}` };
  }

  return { ok: true, path: SYSTEMD_UNIT_PATH, action: "enabled-and-started" };
}

/**
 * Stop, disable, and remove the systemd user service.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, path: string, action: string }}
 */
function uninstallSystemdService({ dryRun = false } = {}) {
  if (!existsSync(SYSTEMD_UNIT_PATH)) {
    return { ok: true, path: SYSTEMD_UNIT_PATH, action: "not-installed" };
  }

  if (dryRun) {
    return { ok: true, path: SYSTEMD_UNIT_PATH, action: "dry-run (unit not removed)" };
  }

  tryExec(`systemctl --user stop "${SYSTEMD_UNIT_NAME}" 2>/dev/null || true`);
  tryExec(`systemctl --user disable "${SYSTEMD_UNIT_NAME}" 2>/dev/null || true`);
  tryExec("systemctl --user daemon-reload");
  rmSync(SYSTEMD_UNIT_PATH, { force: true });

  return { ok: true, path: SYSTEMD_UNIT_PATH, action: "stopped-disabled-removed" };
}

/**
 * Check systemd user service status.
 *
 * @returns {{ installed: boolean, enabled: boolean, active: boolean, pid: number|null, path: string }}
 */
function checkSystemdService() {
  const result = {
    installed: existsSync(SYSTEMD_UNIT_PATH),
    enabled: false,
    active: false,
    pid: null,
    path: SYSTEMD_UNIT_PATH,
  };

  if (!result.installed) {
    return result;
  }

  const enabledOut = tryExec(`systemctl --user is-enabled "${SYSTEMD_UNIT_NAME}" 2>/dev/null || echo "disabled"`);
  result.enabled = enabledOut.trim() === "enabled";

  const activeOut = tryExec(`systemctl --user is-active "${SYSTEMD_UNIT_NAME}" 2>/dev/null || echo "inactive"`);
  result.active = activeOut.trim() === "active";

  const pidOut = tryExec(`systemctl --user show -p MainPID "${SYSTEMD_UNIT_NAME}" 2>/dev/null || echo "MainPID=0"`);
  const pidMatch = pidOut.match(/MainPID=(\d+)/);

  if (pidMatch) {
    const pid = parseInt(pidMatch[1], 10);

    if (pid > 0) {
      result.pid = pid;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Windows - Windows Service
// ═══════════════════════════════════════════════════════════════════════════

const WINDOWS_SERVICE_NAME = "rule-mcp";

/** @returns {string} - Windows command line for the service binary */
function getWindowsServiceCommand() {
  const ep = resolveEntrypoint();

  return `"${ep.node}" "${ep.script}" serve --transport sse`;
}

/**
 * Install Windows service using sc.exe (with PowerShell fallback).
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, name: string, action: string, error?: string }}
 */
function installWindowsService({ dryRun = false } = {}) {
  const name = WINDOWS_SERVICE_NAME;
  const command = getWindowsServiceCommand();

  if (dryRun) {
    return { ok: true, name, action: `dry-run (would create service: ${command})` };
  }

  // Check if service already exists
  const check = tryExec(`sc query "${name}" 2>nul || echo NOT_FOUND`);
  const isExists = !check.includes("NOT_FOUND") && !check.includes("FAILED") && !check.includes("1060");

  if (isExists) {
    // Service exists - update config and restart
    tryExec(`sc config "${name}" binPath= "${command}" start= auto`);
    tryExec(`sc stop "${name}" 2>nul || true`);
    tryExec(`sc start "${name}" 2>nul || true`);

    return { ok: true, name, action: "updated-and-started" };
  }

  // Create new service
  try {
    execSync(`sc create "${name}" binPath= "${command}" start= auto displayName= "rule-mcp MCP Server"`, {
      encoding: "utf8",
      timeout: 10_000,
      stdio: "pipe",
    });
    tryExec(
      `sc description "${name}" "MCP server for the rule-* skill ecosystem. Serves styleguides, component templates, and framework best practices."`,
    );
    tryExec(`sc start "${name}"`);

    return { ok: true, name, action: "created-and-started" };
  } catch {
    // Fallback: try PowerShell New-Service
    try {
      execSync(
        `powershell -Command "New-Service -Name '${name}' -BinaryPathName '${command}' -StartupType Automatic -Description 'MCP server for the rule-* skill ecosystem' ; Start-Service -Name '${name}'"`,
        { encoding: "utf8", timeout: 30_000, stdio: "pipe", shell: true },
      );

      return { ok: true, name, action: "created-and-started (PowerShell)" };
    } catch (error) {
      return { ok: false, name, error: `Failed to create service: ${error.message}` };
    }
  }
}

/**
 * Stop and remove Windows service.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, name: string, action: string }}
 */
function uninstallWindowsService({ dryRun = false } = {}) {
  const name = WINDOWS_SERVICE_NAME;

  // Check if service exists
  const check = tryExec(`sc query "${name}" 2>nul || echo NOT_FOUND`);

  if (check.includes("NOT_FOUND") || check.includes("FAILED") || check.includes("1060")) {
    return { ok: true, name, action: "not-installed" };
  }

  if (dryRun) {
    return { ok: true, name, action: "dry-run (would remove service)" };
  }

  tryExec(`sc stop "${name}" 2>nul || true`);
  tryExec(`sc delete "${name}"`);

  return { ok: true, name, action: "stopped-and-deleted" };
}

/**
 * Check Windows service status.
 *
 * @returns {{ installed: boolean, running: boolean, pid: number|null, name: string }}
 */
function checkWindowsService() {
  const name = WINDOWS_SERVICE_NAME;
  const result = { installed: false, running: false, pid: null, name };

  const out = tryExec(`sc query "${name}"`);
  result.installed = !out.includes("FAILED") && !out.includes("1060") && out.length > 0;

  if (result.installed) {
    result.running = out.includes("RUNNING") || (out.includes("STATE") && out.includes("4"));
    // sc query PID is optional; only shown with qc or extra flags
    const pidMatch = out.match(/PID\s+:\s+(\d+)/i);

    if (pidMatch) {
      result.pid = parseInt(pidMatch[1], 10);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Process-based daemon (fallback / cross-platform)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Start a background daemon process (spawns SSE server as child).
 * This is the original implementation - works everywhere but won't
 * survive reboots or appear in Login Items.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, pid: number|null, action: string }}
 */

export {
  resolveEntrypoint,
  tryExec,
  escapePlist,
  LAUNCH_AGENT_LABEL,
  LAUNCH_AGENT_DIR,
  LAUNCH_AGENT_PATH,
  SYSTEMD_UNIT_NAME,
  SYSTEMD_USER_DIR,
  SYSTEMD_UNIT_PATH,
  WINDOWS_SERVICE_NAME,
  generateLaunchAgentPlist,
  installLaunchAgent,
  uninstallLaunchAgent,
  checkLaunchAgent,
  generateSystemdUnit,
  installSystemdService,
  uninstallSystemdService,
  checkSystemdService,
  getWindowsServiceCommand,
  installWindowsService,
  uninstallWindowsService,
  checkWindowsService,
};
