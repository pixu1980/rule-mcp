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
import { platform } from "node:os";

import { LAUNCH_AGENT_PATH, SYSTEMD_UNIT_PATH, WINDOWS_SERVICE_NAME } from "../daemon/index.js";
import { tryExec } from "../../shared/index.js";

/**
 * @returns {{ present: boolean, detail: string }}
 */
export function daemonServicePresent() {
  if (platform() === "darwin") {
    return { present: existsSync(LAUNCH_AGENT_PATH), detail: LAUNCH_AGENT_PATH };
  }

  if (platform() === "linux") {
    return { present: existsSync(SYSTEMD_UNIT_PATH), detail: SYSTEMD_UNIT_PATH };
  }

  if (platform() === "win32") {
    const query = tryExec(`sc query ${WINDOWS_SERVICE_NAME}`);

    return { present: query.includes(WINDOWS_SERVICE_NAME), detail: `Windows service ${WINDOWS_SERVICE_NAME}` };
  }

  return { present: false, detail: "no platform service on this OS" };
}
