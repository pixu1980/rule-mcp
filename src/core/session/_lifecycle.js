/**
 * @module core/lifecycle
 *
 * One shutdown path, and it always ends in an exit.
 *
 * A server that is asked to stop has to give three things back: the sockets it
 * holds, the children it spawned, and the heap it filled. This module is where
 * everything that needs releasing says so, in one place, so no caller has to
 * remember the whole list.
 *
 * The rule that shapes the code: **a signal handler must never make the process
 * harder to kill.** Registering a listener for SIGINT or SIGTERM removes Node's
 * default termination, so a handler that merely tries to be tidy can hang the
 * process forever (core/telemetry documents that trap and stays out of it).
 * Every handler here runs the cleanups behind an unref'd deadline and then
 * calls exit unconditionally: the tidy path is best effort, the exit is not. A
 * second signal skips the cleanups entirely.
 *
 * Handlers are installed by entrypoints only (serve, the daemon), never at
 * import time by a module the tests load.
 *
 * @see module:server - the stdio entrypoint registers its cleanups here
 * @see module:cli/commands - serveCommand waits on whenShutdown()
 */

/** How long the cleanups get before the exit happens anyway. */
export const SHUTDOWN_DEADLINE_MS = 3000;

/** Signal -> exit code, the shell convention (128 + signal number). */
const SIGNAL_EXIT_CODES = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 };

/** @type {Array<{ name: string, fn: () => unknown }>} */
let _cleanups = [];

/** @type {Set<import("node:child_process").ChildProcess>} */
const _children = new Set();

/** Shutdown state: null until the first shutdown, then the running promise. */
let _shuttingDown = null;

/** Resolvers handed out by whenShutdown(). */
let _waiters = [];

/** Signal listeners installed by installSignalHandlers(), for resetLifecycle(). */
let _installed = [];

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
 * Track a child process so it dies with this one.
 *
 * Only for children this process owns. A deliberately detached child (the
 * daemon, a fire-and-forget indexer) is not tracked: outliving the parent is
 * the whole point of detaching it.
 *
 * @param {import("node:child_process").ChildProcess} child
 */
export function trackChild(child) {
  if (!child?.pid) {
    return;
  }

  _children.add(child);
  child.once("exit", () => _children.delete(child));
}

/** @returns {number} How many children are being tracked. */
export function trackedChildCount() {
  return _children.size;
}

/**
 * Signal every tracked child, then forget it.
 *
 * @param {NodeJS.Signals} [signal]
 * @returns {number} How many children were signaled
 */
export function killTrackedChildren(signal = "SIGTERM") {
  let killed = 0;

  for (const child of _children) {
    try {
      child.kill(signal);
      killed++;
    } catch {
      /* already gone */
    }
  }

  _children.clear();

  return killed;
}

/**
 * A promise that resolves once shutdown has run every cleanup. A serve loop
 * awaits this instead of a promise that never settles, and by the time it
 * resolves the sockets and children are already gone.
 *
 * @returns {Promise<void>}
 */
export function whenShutdown() {
  if (_shuttingDown) {
    return _shuttingDown.then(() => {});
  }

  return new Promise((resolve) => _waiters.push(resolve));
}

/** @returns {boolean} Whether a shutdown has started. */
export function isShuttingDown() {
  return _shuttingDown !== null;
}

/**
 * Run every cleanup once, newest first. Never throws, never runs twice.
 *
 * @param {string} [reason] - Recorded for the caller; not logged from here
 * @returns {Promise<Array<{ name: string, ok: boolean, error?: string }>>}
 */
export function runShutdown(reason = "shutdown") {
  if (_shuttingDown) {
    return _shuttingDown;
  }

  const pending = _cleanups.toReversed();
  _cleanups = [];
  const waiters = _waiters;
  _waiters = [];

  _shuttingDown = (async () => {
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

    for (const resolve of waiters) {
      resolve();
    }

    return results;
  })();

  return _shuttingDown;
}

/**
 * Install the signal handlers. Idempotent per target.
 *
 * @param {{
 *   target?: NodeJS.EventEmitter,
 *   exit?: (code: number) => void,
 *   deadlineMs?: number,
 *   signals?: string[]
 * }} [options] - target and exit are injected by the tests
 * @returns {void}
 */
export function installSignalHandlers(options = {}) {
  const target = options.target ?? process;
  const exit = options.exit ?? ((code) => process.exit(code));
  const deadlineMs = options.deadlineMs ?? SHUTDOWN_DEADLINE_MS;
  const signals = options.signals ?? Object.keys(SIGNAL_EXIT_CODES);

  for (const signal of signals) {
    const handler = () => {
      const code = SIGNAL_EXIT_CODES[signal] ?? 1;
      // Second signal: the operator asked twice, so stop trying to be tidy.
      if (isShuttingDown()) {
        exit(code);

        return;
      }
      // The deadline is unref'd: it exists to bound a hanging cleanup, not to
      // keep an otherwise-finished process alive waiting for its own timer.
      const deadline = setTimeout(() => exit(code), deadlineMs);
      deadline.unref?.();
      const finish = () => {
        clearTimeout(deadline);
        exit(code);
      };
      runShutdown(signal).then(finish).catch(finish);
    };

    target.on(signal, handler);
    _installed.push({ target, signal, handler });
  }
}

/**
 * Forget every cleanup, child, handler and shutdown flag.
 *
 * For the tests, and for a CLI process that starts a second server in-process
 * after stopping the first.
 */
export function resetLifecycle() {
  for (const { target, signal, handler } of _installed) {
    target.off(signal, handler);
  }

  _installed = [];
  _cleanups = [];
  _children.clear();
  _shuttingDown = null;
  _waiters = [];
}
