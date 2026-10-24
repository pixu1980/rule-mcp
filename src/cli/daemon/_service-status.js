/** Service status: the per-platform check, its rendering, names and paths. */
import { LAUNCH_AGENT_LABEL, LAUNCH_AGENT_PATH, checkLaunchAgent } from "./_launchd.js";
import { SYSTEMD_UNIT_NAME, SYSTEMD_UNIT_PATH, checkSystemdService } from "./_systemd.js";
import { WINDOWS_SERVICE_NAME, checkWindowsService } from "./_windows-service.js";
import { detectPlatform } from "./_service.js";
import { daemonProcessStatus } from "./_process-status.js";

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
