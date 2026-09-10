

/**
 * @module transport/auth-rate-limit
 *
 * Token-bucket rate limiting for FAILED bearer authentication, per remote
 * address (hardening 1.3, finding F-S7). A valid token is never throttled -
 * only failures consume budget, so the limiter is invisible to legitimate
 * clients and a wall to a brute-force loop. Every failure emits one
 * structured stderr line so a scan shows up in the logs, not only in the
 * attacker's terminal.
 *
 * Zero dependencies: buckets live in a Map, time is injectable for tests.
 */

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** Default failure budget for network peers before 429. */
const NETWORK_BUDGET = 10;
/** Loopback budget - local tools retry hardest, so it is deliberately generous. */
const LOOPBACK_BUDGET = 60;
/** One token refills per interval (default: one attempt back every 30 s). */
const REFILL_MS = 30_000;

/**
 * Create an auth-failure rate limiter.
 *
 * @param {object} [options]
 * @param {number} [options.networkBudget] - bucket size for non-loopback peers
 * @param {number} [options.loopbackBudget] - bucket size for loopback peers
 * @param {number} [options.refillMs] - milliseconds per refilled token
 * @param {() => number} [options.now] - clock, injectable for tests
 * @param {(line: string) => void} [options.log] - audit sink (default stderr)
 * @returns {{ recordFailure(address: string, context?: {transport?: string, pathname?: string}): {limited: boolean} }}
 */
export function createAuthRateLimiter(options = {}) {
  const networkBudget = options.networkBudget ?? NETWORK_BUDGET;
  const loopbackBudget = options.loopbackBudget ?? Math.max(networkBudget, LOOPBACK_BUDGET);
  const refillMs = options.refillMs ?? REFILL_MS;
  const now = options.now ?? Date.now;
  const log = options.log ?? ((line) => process.stderr.write(`${line}\n`));

  /** @type {Map<string, { tokens: number, updatedAt: number }>} */
  const buckets = new Map();

  function budgetFor(address) {
    return LOOPBACK.has(address) ? loopbackBudget : networkBudget;
  }

  function bucketFor(address) {
    const budget = budgetFor(address);
    let bucket = buckets.get(address);

    if (!bucket) {
      bucket = { tokens: budget, updatedAt: now() };
      buckets.set(address, bucket);

      return bucket;
    }

    const elapsed = now() - bucket.updatedAt;

    if (elapsed >= refillMs) {
      const refilled = Math.floor(elapsed / refillMs);
      bucket.tokens = Math.min(budget, bucket.tokens + refilled);
      bucket.updatedAt += refilled * refillMs;
    }

    return bucket;
  }

  return {
    recordFailure(address, context = {}) {
      const key = address || "unknown";
      const bucket = bucketFor(key);
      const limited = bucket.tokens <= 0;

      if (!limited) {
        bucket.tokens -= 1;
      }

      const parts = ["[rule-mcp] auth-failure", `remote=${key}`];

      if (context.transport) {
        parts.splice(1, 0, `transport=${context.transport}`);
      }

      if (context.pathname) {
        parts.push(`path=${context.pathname}`);
      }

      parts.push(`limited=${limited}`);
      log(parts.join(" "));

      return { limited };
    },
  };
}
