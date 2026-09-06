/** Linux systemd adapter: the user unit, install, uninstall, check. */
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getRuntimePaths } from "../paths.js";
import { HOME, resolveEntrypoint, tryExec, WRAPPER_SCRIPT_PATH, generateWrapperScript } from "./_service-shared.js";
import { generateSystemdUnit } from "./_systemd-unit.js";

// ═══════════════════════════════════════════════════════════════════════════
// Linux - systemd user service
// ═══════════════════════════════════════════════════════════════════════════

/** The systemd unit name. */
export const SYSTEMD_UNIT_NAME = "rule-mcp";

/** Where systemd user units live. */
export const SYSTEMD_USER_DIR = join(HOME, ".config", "systemd", "user");

/** The unit path this install writes. */
export const SYSTEMD_UNIT_PATH = join(SYSTEMD_USER_DIR, `${SYSTEMD_UNIT_NAME}.service`);

/**
 * Install the systemd user service, enable and start it.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, path: string, action: string, error?: string }}
 */
export function installSystemdService({ dryRun = false } = {}) {
  const ep = resolveEntrypoint();
  const content = generateSystemdUnit(ep);

  if (dryRun) {
    return { ok: true, path: SYSTEMD_UNIT_PATH, action: "dry-run (unit not written)" };
  }

  mkdirSync(SYSTEMD_USER_DIR, { recursive: true });
  writeFileSync(SYSTEMD_UNIT_PATH, content, "utf8");

  // Reload daemon, enable, start
  tryExec("systemctl --user daemon-reload");
  tryExec(`systemctl --user enable "${SYSTEMD_UNIT_NAME}"`);
  const out = tryExec(`systemctl --user restart "${SYSTEMD_UNIT_NAME}"`);

  // Check if it failed
  if (out.includes("Failed") || out.includes("failed")) {
    return { ok: false, path: SYSTEMD_UNIT_PATH, error: `systemctl restart failed: ${out}` };
  }

  return { ok: true, path: SYSTEMD_UNIT_PATH, action: "enabled-and-started" };
}

/**
 * Stop, disable, and remove the systemd user service.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, path: string, action: string }}
 */
export function uninstallSystemdService({ dryRun = false } = {}) {
  if (!existsSync(SYSTEMD_UNIT_PATH)) {
    return { ok: true, path: SYSTEMD_UNIT_PATH, action: "not-installed" };
  }

  if (dryRun) {
    return { ok: true, path: SYSTEMD_UNIT_PATH, action: "dry-run (unit not removed)" };
  }

  tryExec(`systemctl --user stop "${SYSTEMD_UNIT_NAME}" 2>/dev/null || true`);
  tryExec(`systemctl --user disable "${SYSTEMD_UNIT_NAME}" 2>/dev/null || true`);
  tryExec("systemctl --user daemon-reload");
  rmSync(SYSTEMD_UNIT_PATH, { force: true });

  return { ok: true, path: SYSTEMD_UNIT_PATH, action: "stopped-disabled-removed" };
}

/**
 * Check systemd user service status.
 *
 * @returns {{ installed: boolean, enabled: boolean, active: boolean, pid: number|null, path: string }}
 */
export function checkSystemdService() {
  const result = {
    installed: existsSync(SYSTEMD_UNIT_PATH),
    enabled: false,
    active: false,
    pid: null,
    path: SYSTEMD_UNIT_PATH,
  };

  if (!result.installed) {
    return result;
  }

  const enabledOut = tryExec(`systemctl --user is-enabled "${SYSTEMD_UNIT_NAME}" 2>/dev/null || echo "disabled"`);
  result.enabled = enabledOut.trim() === "enabled";

  const activeOut = tryExec(`systemctl --user is-active "${SYSTEMD_UNIT_NAME}" 2>/dev/null || echo "inactive"`);
  result.active = activeOut.trim() === "active";

  const pidOut = tryExec(`systemctl --user show -p MainPID "${SYSTEMD_UNIT_NAME}" 2>/dev/null || echo "MainPID=0"`);
  const pidMatch = pidOut.match(/MainPID=(\d+)/);

  if (pidMatch) {
    const pid = parseInt(pidMatch[1], 10);

    if (pid > 0) {
      result.pid = pid;
    }
  }

  return result;
}
