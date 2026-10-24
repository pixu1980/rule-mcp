/**
 * @module core/decision/breaker
 *
 * A three-state breaker for the model call path.
 *
 * Three consecutive failures open it, so a dead router is not asked again until
 * the cooldown expires. The first call after the cooldown is a single probe: a
 * success closes the breaker, a failure opens it for another cooldown.
 */

/**
 * @param {{ threshold?: number, cooldownMs?: number, now?: () => number }} [options]
 * @returns {{
 *   readonly state: "closed"|"open"|"half-open",
 *   readonly failures: number,
 *   allow: () => boolean,
 *   success: () => void,
 *   failure: () => void,
 * }}
 */
export function createBreaker({ threshold = 3, cooldownMs = 30_000, now = Date.now } = {}) {
  if (!Number.isInteger(threshold) || threshold < 1) {
    throw new TypeError(`breaker threshold must be a positive integer, got ${threshold}`);
  }

  if (!Number.isFinite(cooldownMs) || cooldownMs < 0) {
    throw new TypeError(`breaker cooldown must be a non-negative number, got ${cooldownMs}`);
  }

  let state = "closed";
  let failures = 0;
  let openedAt = 0;

  return {
    get state() {
      return state;
    },
    get failures() {
      return failures;
    },
    allow() {
      if (state === "closed") {
        return true;
      }

      if (state === "open" && now() - openedAt >= cooldownMs) {
        state = "half-open";

        return true;
      }

      return false;
    },
    success() {
      state = "closed";
      failures = 0;
    },
    failure() {
      failures += 1;

      if (state !== "half-open" && failures < threshold) {
        return;
      }

      state = "open";
      openedAt = now();
    },
  };
}
