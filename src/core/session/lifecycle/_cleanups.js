

/** The cleanups run at shutdown, newest first. */
import { killTrackedChildren } from "./_children.js";
import { currentShutdown, drainWaiters, setShuttingDown } from "./_state.js";

/** @type {Array<{ name: string, fn: () => unknown }>} */
let _cleanups = [];

/**
 * Register work to run on shutdown. Later registrations run first: a session
 * registry created after the server it belongs to has to close before it.
 *
 * @param {string} name - Reported in the shutdown result; used in tests and logs
 * @param {() => unknown} fn - Sync or async; a throw is recorded, never rethrown
 * @returns {() => void} unregister
 */
export function registerCleanup(name, fn) {
  const entry = { name, fn };
  _cleanups.push(entry);

  return () => {
    _cleanups = _cleanups.filter((c) => c !== entry);
  };
}

/**
 * Run every cleanup once, newest first. Never throws, never runs twice.
 *
 * @param {string} [reason] - Recorded for the caller; not logged from here
 * @returns {Promise<Array<{ name: string, ok: boolean, error?: string }>>}
 */
export function runShutdown(reason = "shutdown") {
  if (currentShutdown()) {
    return currentShutdown();
  }

  const pending = _cleanups.toReversed();
  _cleanups = [];

  const shuttingDown = (async () => {
    const results = [];

    for (const { name, fn } of pending) {
      try {
        await fn(reason);
        results.push({ name, ok: true });
      } catch (error) {
        results.push({ name, ok: false, error: error?.message ?? String(error) });
      }
    }

    killTrackedChildren();
    drainWaiters();

    return results;
  })();

  setShuttingDown(shuttingDown);

  return shuttingDown;
}

/** Forget the registered cleanups (test and re-init). */
/** Forget the registered cleanups (test and re-init). */
export function clearCleanups() {
  _cleanups = [];
}
