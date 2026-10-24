

/** The daemon service arms: install, uninstall, enable, disable. */
import { disableDaemonService, enableDaemonService, installDaemonService, uninstallDaemonService, detectPlatform } from "../../daemon/index.js";
import { getServiceFilePath, getServiceName } from "../../daemon/index.js";
import { print } from "../_shared.js";

/** Install the platform-native service (or its dry-run). */
export function actionInstall(opts) {
  print(`Installing ${detectPlatform()} daemon service...`);
  const result = installDaemonService({ dryRun: opts.dryRun });

  if (result.ok) {
    switch (result.platform) {
      case "macos": {
        print(`✓ LaunchAgent created: ${result.result.path}`);
        print("  The daemon should now appear in:");
        print("    System Settings -> General -> Login Items & Extensions");

        if (result.result.action === "loaded") {
          print("  ✓ launchctl loaded the service (it will start at next login)");
          const svcName = getServiceName();

          if (svcName) {
            print(`  To start now: launchctl start ${svcName}`);
          }
        }

        break;
      }
      case "linux": {
        print(`✓ systemd unit created: ${result.result.path}`);

        if (result.result.action === "enabled-and-started") {
          print("  ✓ Service enabled and started");
        }

        break;
      }
      case "windows": {
        print(`✓ Windows service created: ${result.result.name}`);

        if (result.result.action.includes("started")) {
          print("  ✓ Service started");
        }

        break;
      }
      default: {
        print(`✓ Service installed (${result.service}): ${result.result.action}`);
      }
    }
  } else {
    print(`✗ Failed: ${result.result.error || "unknown error"}`);
  }
}

/** Remove the platform-native service (or its dry-run). */
export async function actionUninstall(opts) {
  print(`Removing ${detectPlatform()} daemon service...`);
  const result = await uninstallDaemonService({ dryRun: opts.dryRun });

  if (result.ok) {
    print(`✓ ${result.service} service removed (${result.result.action})`);
  } else {
    print(`✗ Failed: ${result.result.error || "unknown error"}`);
  }
}

/** Load the service for the current platform (macos/linux/windows arms). */
export function actionEnable() {
  const svcName = getServiceName();

  // Gated on the name, not the path: a Windows service has a name and no file,
  // so gating on the path made the Windows branch unreachable.
  if (!svcName) {
    print("No native service for this platform. Try: rule-mcp daemon install");

    return;
  }

  print(`Enabling service: ${svcName}`);

  enableDaemonService();

  if (detectPlatform() === "macos") {
    const svcPath = getServiceFilePath();

    print(`✓ Service loaded (${svcPath})`);
    print("  It will start at next login and appears in Login Items.");
  } else {
    print("✓ Service enabled and started");
  }
}

/** Unload the service for the current platform. */
export function actionDisable() {
  const svcName = getServiceName();

  // Gated on the name, not the path: see actionEnable.
  if (!svcName) {
    print("No native service for this platform. Try: rule-mcp daemon uninstall");

    return;
  }

  print(`Disabling service: ${svcName}`);

  disableDaemonService();

  if (detectPlatform() === "macos") {
    const svcPath = getServiceFilePath();

    print(`✓ Service unloaded (${svcPath})`);
    print("  It will no longer start at login and is removed from Login Items.");
  } else {
    print("✓ Service stopped and disabled");
  }
}
