

/** The daemon process arms: start and stop, native-first with a process fallback. */
import { checkDaemonService, detectPlatform, getServiceName, startDaemonProcess, stopDaemonProcess } from "../../daemon/index.js";
import { print, tryExec } from "../_shared.js";

/** Start the daemon - the native service when installed, the process otherwise. */
export async function actionStart(opts) {
  const nativeStatus = checkDaemonService();

  if (nativeStatus.installed && detectPlatform() !== "unknown") {
    print(`Using native service (${nativeStatus.service})`);

    if (detectPlatform() === "macos") {
      tryExec(`launchctl start ${getServiceName()}`);
      print("✓ Service started via launchctl");
    } else if (detectPlatform() === "linux") {
      tryExec(`systemctl --user start "${getServiceName()}"`);
      print("✓ Service started via systemctl");
    } else if (detectPlatform() === "windows") {
      tryExec(`sc start "${getServiceName()}"`);
      print("✓ Service started via sc");
    }

    return;
  }

  const proc = startDaemonProcess({ dryRun: opts.dryRun });

  if (proc.pid) {
    print(`Daemon started (pid ${proc.pid})`);
  } else if (proc.action === "already-running") {
    print(`Daemon already running (pid ${proc.pid})`);
  } else {
    print(`Daemon: ${proc.action}`);
  }
}

/** Stop the daemon - the native service when installed, the process otherwise. */
export async function actionStop(opts) {
  const nativeStatus = checkDaemonService();

  if (nativeStatus.installed && detectPlatform() !== "unknown") {
    if (detectPlatform() === "macos") {
      tryExec(`launchctl kill SIGTERM ${getServiceName()}`);
    } else if (detectPlatform() === "linux") {
      tryExec(`systemctl --user stop "${getServiceName()}"`);
    } else if (detectPlatform() === "windows") {
      tryExec(`sc stop "${getServiceName()}"`);
    }

    print("✓ Service stopped");

    return;
  }

  const result = await stopDaemonProcess({ dryRun: opts.dryRun });

  print(result.action === "not-running" ? "Daemon not running" : "Daemon stopped");
}
