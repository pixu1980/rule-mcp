

/**
 * @module core/session/activity
 *
 * When a tool call last passed through.
 *
 * This is the half of idle reclaim that every tool call touches, and it is a
 * timestamp. It lives in its own module because the router imports it: beside
 * the reclaim actions, one call to `touchActivity` would pull the BM25 index,
 * the whole skill catalog and the result cache into the invocation path.
 */

/** Last time a tool call passed through. */
let lastActivityAt = Date.now();

/** True once an idle window has been reclaimed, until the next call arrives. */
let reclaimed = false;

/**
 * Mark the server as in use. Called at the top of every tool call.
 *
 * @param {number} [now] - Injectable clock, for the tests
 */
export function touchActivity(now = Date.now()) {
  lastActivityAt = now;
  reclaimed = false;
}

/**
 * @param {number} [now]
 * @returns {number} Milliseconds since the last tool call
 */
export function idleFor(now = Date.now()) {
  return now - lastActivityAt;
}

/** Whether the current idle window has already been reclaimed. */
export function isReclaimed() {
  return reclaimed;
}

/** Close the current idle window, so the next check does not repeat the work. */
export function markReclaimed() {
  reclaimed = true;
}
