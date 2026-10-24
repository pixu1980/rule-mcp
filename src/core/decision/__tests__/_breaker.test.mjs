/** The breaker opens after the threshold, grants one probe, and closes on success. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { createBreaker } from "../_breaker.js";

test("three consecutive failures open the breaker and a probe closes it", () => {
  let now = 0;
  const breaker = createBreaker({ threshold: 3, cooldownMs: 1_000, now: () => now });

  for (let i = 0; i < 2; i += 1) {
    breaker.failure();
    assert.equal(breaker.state, "closed");
  }

  breaker.failure();
  assert.equal(breaker.state, "open");
  assert.equal(breaker.failures, 3);
  assert.equal(breaker.allow(), false, "an open breaker refuses calls inside the cooldown");

  now = 1_000;
  assert.equal(breaker.allow(), true, "the cooldown grants one probe");
  assert.equal(breaker.state, "half-open");
  assert.equal(breaker.allow(), false, "only one probe is in flight");

  breaker.failure();
  assert.equal(breaker.state, "open");
  assert.equal(breaker.failures, 4);

  now += 1_000;
  assert.equal(breaker.allow(), true);
  breaker.success();
  assert.equal(breaker.state, "closed");
  assert.equal(breaker.failures, 0);
});

test("a success while closed keeps the breaker closed and resets the count", () => {
  const breaker = createBreaker({ threshold: 3, cooldownMs: 1_000, now: () => 0 });

  breaker.failure();
  breaker.success();

  assert.equal(breaker.state, "closed");
  assert.equal(breaker.failures, 0);
});
