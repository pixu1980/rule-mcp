/** Shutdown flag and waiters: the one piece of shared lifecycle state. */
let _shuttingDown = null;
let _waiters = [];

/** @returns {boolean} Whether a shutdown has started. */
export function isShuttingDown() {
  return _shuttingDown !== null;
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

/** Drain the waiters (called once by the shutdown runner). */
export function drainWaiters() {
  const waiters = _waiters;

  _waiters = [];

  for (const resolve of waiters) {
    resolve();
  }
}

/** @param {Promise<unknown[]|null>|null} value */
export function setShuttingDown(value) {
  _shuttingDown = value;
}

/** @returns {Promise<unknown[]|null>|null} the running shutdown, if any */
export function currentShutdown() {
  return _shuttingDown;
}

/** Forget the shutdown flag and the waiters. */
export function resetState() {
  _shuttingDown = null;
  _waiters = [];
}
