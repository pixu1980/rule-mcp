

/** Windows service adapter: the sc.exe command, install, uninstall, check. */
import { execFileSync } from "node:child_process";
import { installViaPowerShell } from "./_windows-powershell.js";
import { resolveEntrypoint, tryExecFile } from "./_service-shared.js";

// Every command goes through an argv array, never a shell string: the paths
// here are HOME- and install-derived, and a shell would execute a `$(...)` in
// one. No `2>nul` on the probes either - tryExecFile pipes stdio, so stderr is
// already discarded, and off Windows that cmd syntax creates a real file named
// `nul` in the working directory instead of a null device.

// ═══════════════════════════════════════════════════════════════════════════
// Windows - Windows Service
// ═══════════════════════════════════════════════════════════════════════════

/** The Windows service name. */
export const WINDOWS_SERVICE_NAME = "rule-mcp";

/** Quote one argv element for a Windows command line, where a space or quote needs it. */
export function quoteWindowsArg(value) {
  return /[\s"]/.test(value) ? `"${value.replaceAll('"', String.raw`\"`)}"` : value;
}

/**
 * The `binPath` sc.exe receives: the argv array joined, each element quoted as
 * needed. Built from the array so a path with a space or a quote cannot split
 * the command line into arguments sc.exe reads as its own.
 *
 * @param {string[]} [command]
 * @returns {string}
 */
export function windowsBinPath(command = resolveEntrypoint().command) {
  return command.map(quoteWindowsArg).join(" ");
}

/** @returns {string} - Windows command line for the service binary */
export function getWindowsServiceCommand(command) {
  return windowsBinPath(command);
}

/** Whether the service is registered, judged by whether `sc query` printed anything. */
function serviceExists(name, exec) {
  return exec("sc", ["query", name]).trim() !== "";
}

/**
 * Install Windows service using sc.exe (with PowerShell fallback).
 *
 * @param {{ dryRun?: boolean, exec?: Function }} [opts]
 * @returns {{ ok: boolean, name: string, action: string, error?: string }}
 */
export function installWindowsService({ dryRun = false, exec = tryExecFile } = {}) {
  const name = WINDOWS_SERVICE_NAME;
  const command = getWindowsServiceCommand();

  if (dryRun) {
    return { ok: true, name, action: `dry-run (would create service: ${command})` };
  }

  if (serviceExists(name, exec)) {
    exec("sc", ["config", name, "binPath=", command, "start=", "auto"]);
    stopWindowsService({ exec });
    startWindowsService({ exec });

    return { ok: true, name, action: "updated-and-started" };
  }

  try {
    execFileSync("sc", ["create", name, "binPath=", command, "start=", "auto", "displayName=", "rule-mcp MCP Server"], {
      encoding: "utf8",
      timeout: 10_000,
      stdio: "pipe",
    });
    exec("sc", ["description", name, "MCP server for the rule-mcp-* skill ecosystem. Serves styleguides, component templates, and framework best practices."]);
    startWindowsService({ exec });

    return { ok: true, name, action: "created-and-started" };
  } catch {
    return installViaPowerShell(name, command);
  }
}

/** Start the Windows service now. */
export function startWindowsService({ exec = tryExecFile } = {}) {
  return exec("sc", ["start", WINDOWS_SERVICE_NAME]);
}

/** Stop the running Windows service. */
export function stopWindowsService({ exec = tryExecFile } = {}) {
  return exec("sc", ["stop", WINDOWS_SERVICE_NAME]);
}

/** Set whether the Windows service starts with the machine. */
export function setWindowsServiceStartup({ exec = tryExecFile, startup = "auto" } = {}) {
  return exec("sc", ["config", WINDOWS_SERVICE_NAME, "start=", startup]);
}

/**
 * Stop and remove Windows service.
 *
 * @param {{ dryRun?: boolean, exec?: Function }} [opts]
 * @returns {{ ok: boolean, name: string, action: string }}
 */
export function uninstallWindowsService({ dryRun = false, exec = tryExecFile } = {}) {
  const name = WINDOWS_SERVICE_NAME;

  if (!serviceExists(name, exec)) {
    return { ok: true, name, action: "not-installed" };
  }

  if (dryRun) {
    return { ok: true, name, action: "dry-run (would remove service)" };
  }

  stopWindowsService({ exec });
  exec("sc", ["delete", name]);

  return { ok: true, name, action: "stopped-and-deleted" };
}

/**
 * Check Windows service status.
 *
 * @param {{ exec?: Function }} [opts]
 * @returns {{ installed: boolean, running: boolean, pid: number|null, name: string }}
 */
export function checkWindowsService({ exec = tryExecFile } = {}) {
  const name = WINDOWS_SERVICE_NAME;
  const result = { installed: false, running: false, pid: null, name };

  const out = exec("sc", ["query", name]);
  result.installed = out.trim() !== "";

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
