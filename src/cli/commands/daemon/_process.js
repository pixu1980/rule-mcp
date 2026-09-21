

/** The daemon process arms: start and stop, native-first with a process fallback. */
import { checkDaemonService, detectPlatform, startDaemonProcess, startDaemonService, stopDaemonProcess, stopDaemonService } from "../../daemon/index.js";
import { print } from "../_shared.js";

/** The line each platform prints after a native start. */
const startedMessage = {
  macos: "✓ Service started via launchctl",
  linux: "✓ Service started via systemctl",
  windows: "✓ Service started via sc",
};

/** Start the daemon - the native service when installed, the process otherwise. */
export async function actionStart(opts) {
  const nativeStatus = checkDaemonService();

  if (nativeStatus.installed && detectPlatform() !== "unknown") {
    print(`Using native service (${nativeStatus.service})`);

    const platform = detectPlatform();

    startDaemonService();

    if (startedMessage[platform]) {
      print(startedMessage[platform]);
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
    stopDaemonService();
    print("✓ Service stopped");

    return;
  }

  const result = await stopDaemonProcess({ dryRun: opts.dryRun });

  print(result.action === "not-running" ? "Daemon not running" : "Daemon stopped");
}
