/** The usage window: slack, membership, the empty aggregate. */

/**
 * How far outside the recorded calls a model turn still belongs to the session.
 *
 * The user's prompt and the model turn that decided to call us happen BEFORE
 * our first recorded call, and the turn that consumed our last result happens
 * after it. A window drawn exactly on the calls would drop both, and the first
 * turn is usually the expensive one - it is the one that writes the prompt
 * cache. Five minutes is wide enough for a turn and far too narrow for a
 * previous session.
 */
export const USAGE_WINDOW_SLACK_MS = 5 * 60_000;

/**
 * Whether a row falls inside the recording window.
 *
 * An unparseable or missing timestamp counts as inside: the alternative is
 * discarding data because of a field the format never promised.
 *
 * @param {string|number|undefined} at
 * @param {{ since?: number, until?: number }} window
 * @returns {boolean}
 */
export function inWindow(at, window) {
  if (window.since === undefined && window.until === undefined) {
    return true;
  }

  const ms = typeof at === "number" ? at : Date.parse(at ?? "");

  if (!Number.isFinite(ms)) {
    return true;
  }

  if (window.since !== undefined && ms < window.since - USAGE_WINDOW_SLACK_MS) {
    return false;
  }

  return window.until === undefined || !(ms > window.until + USAGE_WINDOW_SLACK_MS);
}

/** An empty tally, so every adapter returns the same shape. */
export const emptyUsage = () => ({
  apiCalls: 0,
  userTurns: 0,
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  reasoning: 0,
  peakContext: 0,
});
