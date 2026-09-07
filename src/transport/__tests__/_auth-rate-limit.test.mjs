/**
 * Hardening 1.3 (F-S7): failed bearer auth is rate-limited per remote address
 * and every failure leaves one structured log line.
 *
 * Only FAILURES consume budget: a client with the right token is never
 * throttled. Loopback gets a larger bucket than the network - the daemon's
 * normal clients are local, but local tools also retry hardest.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { createAuthRateLimiter } from "../../../src/transport/_auth-rate-limit.js";

test("failures below the budget answer 401, above it 429", () => {
  let clock = 0;
  const limiter = createAuthRateLimiter({ networkBudget: 3, refillMs: 60_000, now: () => clock });
  const addr = "203.0.113.7";
  for (let index = 0; index < 3; index++) {
    assert.equal(limiter.recordFailure(addr).limited, false, `failure ${index + 1} stays 401`);
  }
  assert.equal(limiter.recordFailure(addr).limited, true, "budget exhausted -> 429");
  assert.equal(limiter.recordFailure(addr).limited, true, "still limited");
});

test("the bucket refills with time", () => {
  let clock = 0;
  const limiter = createAuthRateLimiter({ networkBudget: 2, refillMs: 1000, now: () => clock });
  const addr = "203.0.113.8";
  limiter.recordFailure(addr);
  limiter.recordFailure(addr);
  assert.equal(limiter.recordFailure(addr).limited, true);
  clock += 2100; // two tokens back
  assert.equal(limiter.recordFailure(addr).limited, false, "refilled tokens allow new attempts");
});

test("loopback gets a larger budget than the network", () => {
  let clock = 0;
  const limiter = createAuthRateLimiter({ networkBudget: 2, loopbackBudget: 5, refillMs: 60_000, now: () => clock });
  for (let index = 0; index < 5; index++) {
    assert.equal(limiter.recordFailure("127.0.0.1").limited, false);
  }
  assert.equal(limiter.recordFailure("127.0.0.1").limited, true);
  assert.equal(limiter.recordFailure("::1", "::1").limited, false, "distinct addresses have distinct buckets");
});

test("every failure produces one structured audit line", () => {
  const lines = [];
  let clock = 0;
  const limiter = createAuthRateLimiter({
    networkBudget: 2,
    refillMs: 60_000,
    now: () => clock,
    log: (line) => lines.push(line),
  });
  limiter.recordFailure("203.0.113.9", { transport: "sse", pathname: "/sse" });
  assert.equal(lines.length, 1);
  assert.match(lines[0], /auth-failure/);
  assert.match(lines[0], /transport=sse/);
  assert.match(lines[0], /remote=203\.0\.113\.9/);
  assert.match(lines[0], /path=\/sse/);
});
