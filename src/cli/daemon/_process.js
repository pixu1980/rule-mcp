/** Daemon process lifecycle: log rotation, detached start, graceful stop. */
import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
  rmSync,
  statSync,
  renameSync,
} from "node:fs";
import { getRuntimePaths } from "../paths.js";
import { resolveEntrypoint } from "./_service-shared.js";
import { isAlive, terminate } from "./_process-status.js";

// ─── Entry-point resolution ───────────────────────────────────────────────

/**
 * Resolve the absolute path to the server entry script.
 * Used by all service templates so the daemon knows what to run.
 *
 * @returns {{ node: string, script: string, command: string[] }}
 */

/** Escape a string for use in a plist <string> element. */

/** Rotate the daemon log once it grows past 5 MB (logs.1 keeps the previous run). */
export const LOG_ROTATE_BYTES = 5 * 1024 * 1024;

/** Rotate the daemon log once it exceeds the size cap. */
export function rotateDaemonLog(logFile) {
  try {
    if (existsSync(logFile) && statSync(logFile).size > LOG_ROTATE_BYTES) {
      rmSync(logFile + ".1", { force: true });
      renameSync(logFile, logFile + ".1");
    }
  } catch {
    /* rotation best-effort */
  }
}

/**
 * Spawn the resident daemon process.
 *
 * @param {{ dryRun?: boolean }} [opts]
 */
export function startDaemonProcess({ dryRun = false } = {}) {
  const p = getRuntimePaths();
  mkdirSync(p.stateDir, { recursive: true });

  // Check existing PID
  if (existsSync(p.pidFile)) {
    const pid = Number(readFileSync(p.pidFile, "utf8").trim());
    try {
      process.kill(pid, 0);

      return { ok: true, pid, action: "already-running" };
    } catch {
      rmSync(p.pidFile, { force: true });
    }
  }

  if (dryRun) {
    return { ok: true, pid: null, action: "dry-run (would spawn daemon)" };
  }

  rotateDaemonLog(p.logFile);

  const ep = resolveEntrypoint();
  // The daemon writes to the log file itself, through an inherited descriptor.
  //
  // Piping its output here instead would make "detached" a claim rather than a
  // fact: unref() releases the child handle but not the stdio pipes, so this
  // process would never exit, and would stay as a second node process whose
  // only job is copying bytes - one whose death breaks the daemon's writes.
  const logFd = openSync(p.logFile, "a", 0o600);
  let child;
  try {
    child = spawn(ep.node, ep.command.slice(1), {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      env: { ...process.env, RULE_MCP_DAEMON: "1" },
    });
  } finally {
    // The child has its own copy of the descriptor now.
    closeSync(logFd);
  }

  child.unref();
  writeFileSync(p.pidFile, String(child.pid));

  return { ok: true, pid: child.pid, action: "started" };
}

/**
 * Stop the background daemon process.
 *
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ ok: boolean, action: string }}
 */
export async function stopDaemonProcess({ dryRun = false } = {}) {
  const p = getRuntimePaths();

  if (!existsSync(p.pidFile)) {
    return { ok: true, action: "not-running" };
  }

  if (dryRun) {
    return { ok: true, action: "dry-run (would stop daemon)" };
  }

  const pid = Number(readFileSync(p.pidFile, "utf8").trim());
  const action = await terminate(pid);
  // The pid file is removed only once the process is gone: removing it after a
  // single SIGTERM would throw away the only record of a daemon that ignored
  // the signal, leaving nothing able to stop it.
  if (action !== "still-running") {
    rmSync(p.pidFile, { force: true });
  }

  return { ok: action !== "still-running", action };
}
