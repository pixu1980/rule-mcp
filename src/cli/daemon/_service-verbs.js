/**
 * @module cli/daemon/service-verbs
 *
 * The lifecycle verbs: enable, disable, start, stop, one platform switch each.
 *
 * The command layer asks for a verb; it never spells a platform command. Every
 * launchctl/systemctl/sc line lives in the adapter that owns that platform, so
 * a fix lands in one file instead of two.
 */

import { detectPlatform } from "./_service.js";
import { loadLaunchAgent, startLaunchAgent, stopLaunchAgent, unloadLaunchAgent } from "./_launchd.js";
import { disableSystemdService, enableSystemdService, startSystemdService, stopSystemdService } from "./_systemd.js";
import { setWindowsServiceStartup, startWindowsService, stopWindowsService } from "./_windows-service.js";

/** Enable the native service: load the agent, or enable and start the unit. */
export function enableDaemonService({ exec } = {}) {
  switch (detectPlatform()) {
    case "macos": {
      loadLaunchAgent({ exec });

      return { service: "launchd", action: "loaded" };
    }
    case "linux": {
      enableSystemdService({ exec });
      startSystemdService({ exec });

      return { service: "systemd", action: "enabled-and-started" };
    }
    case "windows": {
      setWindowsServiceStartup({ exec, startup: "auto" });
      startWindowsService({ exec });

      return { service: "windows-service", action: "enabled-and-started" };
    }
    default: {
      return { service: "none", action: "no-native-service" };
    }
  }
}

/** Disable the native service, leaving the artifact in place. */
export function disableDaemonService({ exec } = {}) {
  switch (detectPlatform()) {
    case "macos": {
      unloadLaunchAgent({ exec });

      return { service: "launchd", action: "unloaded" };
    }
    case "linux": {
      stopSystemdService({ exec });
      disableSystemdService({ exec });

      return { service: "systemd", action: "stopped-and-disabled" };
    }
    case "windows": {
      stopWindowsService({ exec });
      setWindowsServiceStartup({ exec, startup: "demand" });

      return { service: "windows-service", action: "stopped-and-disabled" };
    }
    default: {
      return { service: "none", action: "no-native-service" };
    }
  }
}

/** Start the native service now. */
export function startDaemonService({ exec } = {}) {
  switch (detectPlatform()) {
    case "macos": {
      startLaunchAgent({ exec });

      return { service: "launchd", action: "started" };
    }
    case "linux": {
      startSystemdService({ exec });

      return { service: "systemd", action: "started" };
    }
    case "windows": {
      startWindowsService({ exec });

      return { service: "windows-service", action: "started" };
    }
    default: {
      return { service: "none", action: "no-native-service" };
    }
  }
}

/** Stop the native service, leaving it enabled. */
export function stopDaemonService({ exec } = {}) {
  switch (detectPlatform()) {
    case "macos": {
      stopLaunchAgent({ exec });

      return { service: "launchd", action: "stopped" };
    }
    case "linux": {
      stopSystemdService({ exec });

      return { service: "systemd", action: "stopped" };
    }
    case "windows": {
      stopWindowsService({ exec });

      return { service: "windows-service", action: "stopped" };
    }
    default: {
      return { service: "none", action: "no-native-service" };
    }
  }
}
