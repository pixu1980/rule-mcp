

/**
 * @module test/lifecycle/fixture
 *
 * Shutdown, child reaping, session reaping, and idle memory release.
 *
 * The unit half of the process-hygiene work. Every case here is about giving
 * something back: a cleanup that runs once, a child that dies with its parent,
 * a session whose stream is gone, a cache that returns its heap and reloads
 * from disk. The integration half - a real orphan, a real signal - lives in
 * test/process-hygiene.test.mjs.
 */

import "node:child_process";
import "node:path";

export const lifecycle = await import("../../../core/session/lifecycle/index.js");

export { isAlive as alive } from "../../../cli/daemon/_process-status.js";
export { until } from "../../../shared/_testkit.js";

/**
 * A stand-in for `process` as a signal source: the handlers under test only
 * need on/off/emit, and a real emitter here would mean sending real signals to
 * the test runner.
 */
export function signalTarget() {
  const listeners = new Map();

  return {
    on(event, handler) {
      listeners.set(event, [...(listeners.get(event) ?? []), handler]);
    },
    off(event, handler) {
      listeners.set(
        event,
        (listeners.get(event) ?? []).filter((h) => h !== handler),
      );
    },
    emit(event, ...args) {
      for (const handler of listeners.get(event) ?? []) {
        handler(...args);
      }
    },
  };
}
