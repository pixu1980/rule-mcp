/** Session-registry policy constants. */

/** Default idle ceiling: a session nobody has touched in an hour is gone. */
export const DEFAULT_IDLE_MS = 3_600_000;

/** Default sweep interval. */
export const DEFAULT_SWEEP_MS = 60_000;

/** Default session ceiling - bounds memory against session-creation floods. */
export const DEFAULT_MAX_SESSIONS = 256;
