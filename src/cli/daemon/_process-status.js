/** Daemon process introspection: liveness, termination, the status read. */
import { existsSync, readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { getRuntimePaths } from "../paths.js";

/** Whether a pid is alive, without signaling it. */
export function isAlive(pid) {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

/**
 * Ask a process to stop, then insist.
 *
 * SIGTERM first, because a graceful daemon closes its sessions and flushes what
 * it buffered. SIGKILL after the grace period, because a daemon that will not
 * die is worse than one that dies badly: it holds the port, and the next start
 * fails for a reason nobody can see. The pid file outlives neither.
 *
 * `still-running` means the SIGKILL itself was refused - the process belongs to
 * somebody else.
 *
 * @param {number} pid
 * @param {{ graceMs?: number, stepMs?: number }} [options]
 * @returns {Promise<"stopped"|"killed"|"already-gone"|"still-running">}
 */
export async function terminate(pid, options = {}) {
  const graceMs = options.graceMs ?? 3000;
  const stepMs = options.stepMs ?? 50;

  if (!Number.isInteger(pid) || pid <= 1 || !isAlive(pid)) {
    return "already-gone";
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return "already-gone";
  }

  for (let waited = 0; waited < graceMs; waited += stepMs) {
    await sleep(stepMs);

    if (!isAlive(pid)) {
      return "stopped";
    }
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    // ESRCH: it died in the gap between the last check and this signal.
    return error?.code === "ESRCH" ? "stopped" : "still-running";
  }

  return "killed";
}

/**
 * Check the status of the process-based daemon.
 *
 * @returns {{ running: boolean, pid: number|null, stalePid: number|null, pidFile: string, logFile: string }}
 */
export function daemonProcessStatus() {
  const p = getRuntimePaths();
  const result = { running: false, pid: null, stalePid: null, pidFile: p.pidFile, logFile: p.logFile };

  if (!existsSync(p.pidFile)) {
    return result;
  }

  const pid = Number(readFileSync(p.pidFile, "utf8").trim());

  try {
    process.kill(pid, 0);
    result.running = true;
    result.pid = pid;
  } catch {
    result.stalePid = pid;
  }

  return result;
}
