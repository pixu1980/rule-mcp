

/** @module core/sync/config - sync guard policy. */

/**
 * Throttle between base-freshness checks on tool calls (ms).
 *
 * The check is a handful of local git reads, so the budget is small: the point
 * is that a tight tool loop does not spawn a `git` process per call. It is a
 * rate limit on an event-driven check, never a timer - no check runs on its own.
 */
export const CHECK_INTERVAL_MS = 2000;

/**
 * Whether the branch-sync guard runs on the tool-call path.
 *
 * @returns {boolean}
 */
export function syncGuardEnabled() {
  return process.env.RULE_MCP_NO_SYNC_GUARD !== "1";
}
