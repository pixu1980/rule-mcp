/** Daemon lifecycle command: install/enable/disable/start/stop/status/logs arms. */

import {
  checkDaemonService,
  detectPlatform,
  formatDaemonStatus,
  getServiceFilePath,
  getServiceName,
  installDaemonService,
  startDaemonProcess,
  stopDaemonProcess,
  uninstallDaemonService,
} from "../daemon/index.js";
import { existsSync, readFileSync } from "node:fs";
import { getRuntimePaths } from "../paths/index.js";
import { print, tryExec } from "./_shared.js";
async function daemonCommand(opts) {
  const p = getRuntimePaths();
  const { action = "status", dryRun = false } = opts;

  switch (action) {
    case "install": {
      print(`Installing ${detectPlatform()} daemon service...`);
      const result = installDaemonService({ dryRun });

      if (result.ok) {
        switch (result.platform) {
          case "macos": {
            print(`✓ LaunchAgent created: ${result.result.path}`);
            print(`  The daemon should now appear in:`);
            print(`    System Settings → General → Login Items & Extensions`);

            if (result.result.action === "loaded") {
              print(`  ✓ launchctl loaded the service (it will start at next login)`);
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
              print(`  ✓ Service enabled and started`);
            }

            break;
          }
          case "windows": {
            print(`✓ Windows service created: ${result.result.name}`);

            if (result.result.action.includes("started")) {
              print(`  ✓ Service started`);
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

      break;
    }
    case "uninstall": {
      print(`Removing ${detectPlatform()} daemon service...`);
      const result = uninstallDaemonService({ dryRun });

      if (result.ok) {
        print(`✓ ${result.service} service removed (${result.result.action})`);
      } else {
        print(`✗ Failed: ${result.result.error || "unknown error"}`);
      }

      break;
    }
    case "enable": {
      const svcPath = getServiceFilePath();
      const svcName = getServiceName();

      if (!svcPath) {
        print("No native service file for this platform. Try: rule-mcp daemon install");
        break;
      }

      print(`Enabling service: ${svcName}`);

      if (detectPlatform() === "macos") {
        tryExec(`launchctl load -w "${svcPath}"`);
        print(`✓ Service loaded (${svcPath})`);
        print(`  It will start at next login and appears in Login Items.`);
      } else if (detectPlatform() === "linux") {
        tryExec(`systemctl --user enable "${svcName}"`);
        tryExec(`systemctl --user start "${svcName}"`);
        print(`✓ Service enabled and started`);
      } else if (detectPlatform() === "windows") {
        tryExec(`sc config "${svcName}" start= auto`);
        tryExec(`sc start "${svcName}"`);
        print(`✓ Service enabled and started`);
      }

      break;
    }
    case "disable": {
      const svcPath = getServiceFilePath();
      const svcName = getServiceName();

      if (!svcPath) {
        print("No native service file for this platform. Try: rule-mcp daemon uninstall");
        break;
      }

      print(`Disabling service: ${svcName}`);

      if (detectPlatform() === "macos") {
        tryExec(`launchctl unload -w "${svcPath}"`);
        print(`✓ Service unloaded (${svcPath})`);
        print(`  It will no longer start at login and is removed from Login Items.`);
      } else if (detectPlatform() === "linux") {
        tryExec(`systemctl --user stop "${svcName}"`);
        tryExec(`systemctl --user disable "${svcName}"`);
        print(`✓ Service stopped and disabled`);
      } else if (detectPlatform() === "windows") {
        tryExec(`sc stop "${svcName}"`);
        tryExec(`sc config "${svcName}" start= demand`);
        print(`✓ Service stopped and disabled`);
      }

      break;
    }
    case "start": {
      const nativeStatus = checkDaemonService();

      if (nativeStatus.installed && detectPlatform() !== "unknown") {
        print(`Using native service (${nativeStatus.service})`);

        if (detectPlatform() === "macos") {
          tryExec(`launchctl start ${getServiceName()}`);
          print(`✓ Service started via launchctl`);
        } else if (detectPlatform() === "linux") {
          tryExec(`systemctl --user start "${getServiceName()}"`);
          print(`✓ Service started via systemctl`);
        } else if (detectPlatform() === "windows") {
          tryExec(`sc start "${getServiceName()}"`);
          print(`✓ Service started via sc`);
        }

        break;
      }
      // Fallback to process daemon
      const proc = startDaemonProcess({ dryRun });

      if (proc.pid) {
        print(`Daemon started (pid ${proc.pid})`);
      } else if (proc.action === "already-running") {
        print(`Daemon already running (pid ${proc.pid})`);
      } else {
        print(`Daemon: ${proc.action}`);
      }

      break;
    }
    case "stop": {
      const nativeStatus = checkDaemonService();

      if (nativeStatus.installed && detectPlatform() !== "unknown") {
        if (detectPlatform() === "macos") {
          tryExec(`launchctl kill SIGTERM ${getServiceName()}`);
        } else if (detectPlatform() === "linux") {
          tryExec(`systemctl --user stop "${getServiceName()}"`);
        } else if (detectPlatform() === "windows") {
          tryExec(`sc stop "${getServiceName()}"`);
        }

        print(`✓ Service stopped`);
        break;
      }
      // Fallback to process daemon
      const result = await stopDaemonProcess({ dryRun });

      print(result.action === "not-running" ? "Daemon not running" : "Daemon stopped");
      break;
    }
    case "status": {
      print(formatDaemonStatus());
      break;
    }
    case "logs": {
      if (!existsSync(p.logFile)) {
        print("No logs yet");

        return;
      }

      print(readFileSync(p.logFile, "utf8"));
      break;
    }
    default: {
      throw new Error(`Unknown daemon action: ${action}. Available: start, stop, status, logs, install, uninstall, enable, disable`);
    }
  }
}

/**
 * Install rule-mcp into an agent/IDE.
 *
 * @param {{ agent: string, dryRun: boolean, force: boolean, global?: boolean, mode?: "stdio"|"daemon"|"sse"|"docker" }} opts
 */

export { daemonCommand };
