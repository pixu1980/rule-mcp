

/** macOS launchd adapter: the LaunchAgent plist, install, uninstall, the lifecycle verbs, check. */
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { generateLaunchAgentPlist } from "./_launchd-plist.js";
import { HOME, resolveEntrypoint, tryExecFile, WRAPPER_SCRIPT_PATH, generateWrapperScript } from "./_service-shared.js";

// ═══════════════════════════════════════════════════════════════════════════
// macOS - LaunchAgent plist
// ═══════════════════════════════════════════════════════════════════════════

/** The LaunchAgent label. */
export const LAUNCH_AGENT_LABEL = "io.github.rule.rule-mcp";

/** Where user LaunchAgents live. */
export const LAUNCH_AGENT_DIR = join(HOME, "Library", "LaunchAgents");

/** The plist path this install writes. */
export const LAUNCH_AGENT_PATH = join(LAUNCH_AGENT_DIR, `${LAUNCH_AGENT_LABEL}.plist`);

/**
 * Install the macOS LaunchAgent plist and wrapper script, then load it.
 * After this, the daemon appears in System Settings → General → Login Items
 * as "rule-mcpd" (not "Node.js Foundation").
 *
 * @param {{ dryRun?: boolean, exec?: Function }} [opts]
 * @returns {{ ok: boolean, path: string, action: string, error?: string }}
 */
export function installLaunchAgent({ dryRun = false, exec = tryExecFile } = {}) {
  const ep = resolveEntrypoint();

  if (dryRun) {
    return { ok: true, path: LAUNCH_AGENT_PATH, action: "dry-run (plist not written)" };
  }

  // Write wrapper script first (so the plist references something valid)
  mkdirSync(dirname(WRAPPER_SCRIPT_PATH), { recursive: true });
  writeFileSync(WRAPPER_SCRIPT_PATH, generateWrapperScript(ep), "utf8");
  exec("chmod", ["+x", WRAPPER_SCRIPT_PATH]);

  // Write plist
  mkdirSync(LAUNCH_AGENT_DIR, { recursive: true });
  writeFileSync(LAUNCH_AGENT_PATH, generateLaunchAgentPlist(ep), "utf8");

  // Unload first if already loaded (to overwrite)
  unloadLaunchAgent({ exec });

  // Load the new plist
  const out = loadLaunchAgent({ exec });

  if (out.includes("Error") || out.includes("error")) {
    return { ok: false, path: LAUNCH_AGENT_PATH, error: `launchctl load failed: ${out}` };
  }

  return { ok: true, path: LAUNCH_AGENT_PATH, action: "loaded" };
}

/** Load the LaunchAgent into launchd. */
export function loadLaunchAgent({ exec = tryExecFile } = {}) {
  return exec("launchctl", ["load", "-w", LAUNCH_AGENT_PATH]);
}

/** Unload a loaded agent, trying both launchctl spellings. */
export function unloadLaunchAgent({ exec = tryExecFile } = {}) {
  const out = exec("launchctl", ["unload", "-w", LAUNCH_AGENT_PATH]);

  exec("launchctl", ["remove", LAUNCH_AGENT_LABEL]);

  return out;
}

/** Start the loaded LaunchAgent now, without waiting for the next login. */
export function startLaunchAgent({ exec = tryExecFile } = {}) {
  return exec("launchctl", ["start", LAUNCH_AGENT_LABEL]);
}

/** Stop the loaded LaunchAgent, leaving it loaded for the next login. */
export function stopLaunchAgent({ exec = tryExecFile } = {}) {
  return exec("launchctl", ["kill", "SIGTERM", LAUNCH_AGENT_LABEL]);
}

/**
 * Unload and remove the macOS LaunchAgent plist and wrapper script.
 *
 * @param {{ dryRun?: boolean, exec?: Function }} [opts]
 * @returns {{ ok: boolean, path: string, action: string }}
 */
export function uninstallLaunchAgent({ dryRun = false, exec = tryExecFile } = {}) {
  if (!existsSync(LAUNCH_AGENT_PATH)) {
    return { ok: true, path: LAUNCH_AGENT_PATH, action: "not-installed" };
  }

  if (dryRun) {
    return { ok: true, path: LAUNCH_AGENT_PATH, action: "dry-run (plist not removed)" };
  }

  // Unload first
  unloadLaunchAgent({ exec });

  // Remove plist
  rmSync(LAUNCH_AGENT_PATH, { force: true });

  // Remove wrapper script
  if (existsSync(WRAPPER_SCRIPT_PATH)) {
    rmSync(WRAPPER_SCRIPT_PATH, { force: true });
  }

  return { ok: true, path: LAUNCH_AGENT_PATH, action: "unloaded-and-removed" };
}

/**
 * Check macOS LaunchAgent status.
 *
 * @param {{ exec?: Function }} [opts]
 * @returns {{ installed: boolean, loaded: boolean, pid: number|null, path: string }}
 */
export function checkLaunchAgent({ exec = tryExecFile } = {}) {
  const result = { installed: existsSync(LAUNCH_AGENT_PATH), loaded: false, pid: null, path: LAUNCH_AGENT_PATH };

  if (result.installed) {
    const out = exec("launchctl", ["list", LAUNCH_AGENT_LABEL]);

    if (out.includes(LAUNCH_AGENT_LABEL)) {
      result.loaded = true;
      // New macOS format (Ventura+): plist-style dict with "PID" = 12345;
      const newPidMatch = out.match(/"PID"\s*=\s*(\d+)/);

      if (newPidMatch) {
        const pid = parseInt(newPidMatch[1], 10);

        if (pid > 0) {
          result.pid = pid;
        }
      } else {
        // Alternative format: "PID\tStatus\tLabel"
        const oldPidMatch = out.match(/^(\d+)\t/m);

        if (oldPidMatch) {
          const pid = parseInt(oldPidMatch[1], 10);

          if (pid > 0) {
            result.pid = pid;
          }
        }
      }
    }
  }

  return result;
}
