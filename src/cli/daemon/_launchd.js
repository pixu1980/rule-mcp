/** macOS launchd adapter: the LaunchAgent plist, install, uninstall, check. */
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { generateLaunchAgentPlist } from "./_launchd-plist.js";
import { HOME, resolveEntrypoint, tryExec, WRAPPER_SCRIPT_PATH, generateWrapperScript } from "./_service-shared.js";

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
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, path: string, action: string, error?: string }}
 */
export function installLaunchAgent({ dryRun = false } = {}) {
  const ep = resolveEntrypoint();

  if (dryRun) {
    return { ok: true, path: LAUNCH_AGENT_PATH, action: "dry-run (plist not written)" };
  }

  // Write wrapper script first (so the plist references something valid)
  mkdirSync(dirname(WRAPPER_SCRIPT_PATH), { recursive: true });
  writeFileSync(WRAPPER_SCRIPT_PATH, generateWrapperScript(ep), "utf8");
  tryExec(`chmod +x "${WRAPPER_SCRIPT_PATH}"`);

  // Write plist
  mkdirSync(LAUNCH_AGENT_DIR, { recursive: true });
  writeFileSync(LAUNCH_AGENT_PATH, generateLaunchAgentPlist(ep), "utf8");

  // Unload first if already loaded (to overwrite)
  tryExec(`launchctl unload -w "${LAUNCH_AGENT_PATH}" 2>/dev/null || launchctl remove ${LAUNCH_AGENT_LABEL} 2>/dev/null || true`);

  // Load the new plist
  const out = tryExec(`launchctl load -w "${LAUNCH_AGENT_PATH}"`);

  if (out.includes("Error") || out.includes("error")) {
    return { ok: false, path: LAUNCH_AGENT_PATH, error: `launchctl load failed: ${out}` };
  }

  return { ok: true, path: LAUNCH_AGENT_PATH, action: "loaded" };
}

/**
 * Unload and remove the macOS LaunchAgent plist and wrapper script.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, path: string, action: string }}
 */
export function uninstallLaunchAgent({ dryRun = false } = {}) {
  if (!existsSync(LAUNCH_AGENT_PATH)) {
    return { ok: true, path: LAUNCH_AGENT_PATH, action: "not-installed" };
  }

  if (dryRun) {
    return { ok: true, path: LAUNCH_AGENT_PATH, action: "dry-run (plist not removed)" };
  }

  // Unload first
  tryExec(`launchctl unload -w "${LAUNCH_AGENT_PATH}" 2>/dev/null || launchctl remove ${LAUNCH_AGENT_LABEL} 2>/dev/null || true`);

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
 * @returns {{ installed: boolean, loaded: boolean, pid: number|null, path: string }}
 */
export function checkLaunchAgent() {
  const result = { installed: existsSync(LAUNCH_AGENT_PATH), loaded: false, pid: null, path: LAUNCH_AGENT_PATH };

  if (result.installed) {
    const out = tryExec(`launchctl list ${LAUNCH_AGENT_LABEL} 2>/dev/null || true`);

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
