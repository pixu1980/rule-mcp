

/**
 * @module cli/setup/service-status
 *
 * Whether a platform-native background service is registered, without
 * starting or touching it.
 *
 * The uninstall scan needs a yes/no before it offers to remove anything;
 * `uninstallDaemonService` answers that question by doing the removal, which
 * is too late.
 */

import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

import { LAUNCH_AGENT_PATH, WINDOWS_SERVICE_NAME } from "../daemon/index.js";
import { tryExec } from "../../shared/index.js";

/** The systemd user unit this installer writes. */
export const systemdUnitPath = (home = homedir()) => join(home, ".config", "systemd", "user", "rule-mcp.service");

/**
 * @returns {{ present: boolean, detail: string }}
 */
export function daemonServicePresent() {
  if (platform() === "darwin") {
    return { present: existsSync(LAUNCH_AGENT_PATH), detail: LAUNCH_AGENT_PATH };
  }

  if (platform() === "linux") {
    const unit = systemdUnitPath();

    return { present: existsSync(unit), detail: unit };
  }

  if (platform() === "win32") {
    const query = tryExec(`sc query ${WINDOWS_SERVICE_NAME}`);

    return { present: query.includes(WINDOWS_SERVICE_NAME), detail: `Windows service ${WINDOWS_SERVICE_NAME}` };
  }

  return { present: false, detail: "no platform service on this OS" };
}
