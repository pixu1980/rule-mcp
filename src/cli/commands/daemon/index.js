/** Daemon lifecycle command: install/enable/disable/start/stop/status/logs arms. */
import { getRuntimePaths } from "../../paths/index.js";
import { actionDisable, actionEnable, actionInstall, actionUninstall } from "./_service.js";
import { actionStart, actionStop } from "./_process.js";
import { actionLogs, actionStatus } from "./_reporting.js";

/**
 * Daemon lifecycle command: install/enable/disable/start/stop/status/logs.
 *
 * @param {{ action?: string, dryRun?: boolean }} opts
 */
export async function daemonCommand(opts) {
  const p = getRuntimePaths();
  const { action = "status", dryRun = false } = opts;

  switch (action) {
    case "install": {
      actionInstall({ dryRun });
      break;
    }
    case "uninstall": {
      await actionUninstall({ dryRun });
      break;
    }
    case "enable": {
      actionEnable();
      break;
    }
    case "disable": {
      actionDisable();
      break;
    }
    case "start": {
      await actionStart({ dryRun });
      break;
    }
    case "stop": {
      await actionStop({ dryRun });
      break;
    }
    case "status": {
      actionStatus();
      break;
    }
    case "logs": {
      actionLogs(p.logFile);
      break;
    }
    default: {
      throw new Error(`Unknown daemon action: ${action}. Available: start, stop, status, logs, install, uninstall, enable, disable`);
    }
  }
}
