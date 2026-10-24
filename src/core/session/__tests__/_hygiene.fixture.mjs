/**
 * @module test/process-hygiene/fixture
 *
 * Shared plumbing: a free port, liveness probes, bounded waits and the reaper.
 * Slow by nature: these suites spawn real processes and wait for them to die.
 */
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

export { isAlive as alive } from "../../../cli/daemon/_process-status.js";
export { until } from "../../../shared/_testkit.js";

export const root = fileURLToPath(new URL("../../../..", import.meta.url));
export const bin = join(root, "bin", "rule-mcp.js");

/** A port nobody is listening on. */
export function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

/**
 * Resolve to `value` when `promise` has not settled within `ms`.
 *
 * The timer is cleared whichever side wins. A bare `setTimeout` inside a
 * `Promise.race` stays armed once the race is decided, and the event loop
 * waits for it: the six this file used to arm held it open for 19 seconds
 * after the last assertion had already passed.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {T} value
 * @returns {Promise<T>}
 */
export async function within(promise, ms, value) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(value), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** SIGKILL a pid, ignoring the case where it is already gone. */
export function reap(pid) {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    /* already gone */
  }
}
