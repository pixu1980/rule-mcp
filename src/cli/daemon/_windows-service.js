/** Windows service adapter: the sc.exe command, install, uninstall, check. */
import { getRuntimePaths } from "../paths.js";
import { resolveEntrypoint, tryExec } from "./_service-shared.js";

// ═══════════════════════════════════════════════════════════════════════════
// Windows - Windows Service
// ═══════════════════════════════════════════════════════════════════════════

/** The Windows service name. */
export const WINDOWS_SERVICE_NAME = "rule-mcp";

/** @returns {string} - Windows command line for the service binary */
export function getWindowsServiceCommand() {
  const ep = resolveEntrypoint();

  return `"${ep.node}" "${ep.script}" serve --transport sse`;
}

/**
 * Install Windows service using sc.exe (with PowerShell fallback).
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, name: string, action: string, error?: string }}
 */
export function installWindowsService({ dryRun = false } = {}) {
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
export function uninstallWindowsService({ dryRun = false } = {}) {
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
export function checkWindowsService() {
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
