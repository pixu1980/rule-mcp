/** Service management: the platform detection and the install/uninstall dispatch. */
import { platform } from "node:os";
import { startDaemonProcess, stopDaemonProcess } from "./_process.js";
import { installLaunchAgent, uninstallLaunchAgent } from "./_launchd.js";
import { installSystemdService, uninstallSystemdService } from "./_systemd.js";
import { installWindowsService, uninstallWindowsService } from "./_windows-service.js";

// ─── Platform detection ───────────────────────────────────────────────────

/** Whether this host is macOS. */
export const IS_MACOS = platform() === "darwin";

/** Whether this host is Linux. */
export const IS_LINUX = platform() === "linux";

/** Whether this host is Windows. */
export const IS_WINDOWS = platform() === "win32";

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
 * System Settings -> General -> Login Items & Extensions.
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
 * Async because the process fallback has to be awaited: returning its promise
 * unawaited reported `ok: undefined` and a pending promise as the result, so
 * `daemon uninstall` printed a failure on every platform without a native
 * service even when the stop had succeeded.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, platform: string, service: string, result: object }>}
 */
export async function uninstallDaemonService({ dryRun = false } = {}) {
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
      const proc = await stopDaemonProcess({ dryRun });

      return { ok: proc.ok, platform: "unknown", service: "process", result: proc };
    }
  }
}
