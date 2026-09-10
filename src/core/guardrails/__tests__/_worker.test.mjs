

/**
 * Hardening 1.2 (F-S1): server paths run checkCode in a worker thread with a
 * hard timeout. A runaway pattern is terminated and reported instead of
 * freezing the only thread of a daemon every client shares; the next call
 * gets a fresh worker and a normal answer.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

process.env.RULE_MCP_GUARDED_CHECKS = "1"; // servers guard; CLI/tests run inline by default

const { checkCodeGuarded, shutdownGuardrailWorker } = await import("../../../../src/core/guardrails/index.js");

test("a normal check answers like the inline engine", async () => {
  const result = await checkCodeGuarded("rule-styleguide-css", "a { color: red; }", { fileName: "a.css" });
  assert.equal(typeof result.allPass, "boolean");
  assert.ok(result.total > 0);
  assert.equal(result.aborted, undefined);
});

test("a runaway check is aborted at the budget and the next call answers", async () => {
  await shutdownGuardrailWorker();
  process.env.RULE_MCP_TEST_SLOW_CHECK_MS = "60000";
  try {
    const started = performance.now();
    const aborted = await checkCodeGuarded("rule-styleguide-css", "a { color: red; }", { fileName: "a.css" }, { timeoutMs: 500 });
    const elapsed = performance.now() - started;
    assert.equal(aborted.aborted, true, "the runaway check must be aborted");
    assert.equal(aborted.allPass, false);
    assert.match(aborted.summary, /aborted/i);
    assert.equal(aborted.failed[0].id, "check-timeout");
    assert.ok(elapsed < 5000, `abort must be prompt, took ${Math.round(elapsed)}ms`);
  } finally {
    delete process.env.RULE_MCP_TEST_SLOW_CHECK_MS;
  }
  const next = await checkCodeGuarded("rule-styleguide-css", "a { color: red; }", { fileName: "a.css" });
  assert.equal(typeof next.allPass, "boolean", "the daemon answers the next call after an abort");
  assert.equal(next.aborted, undefined);
  await shutdownGuardrailWorker();
});
