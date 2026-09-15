

/**
 * Project-level guardrails: the graph checks pass, fail or skip, and a
 * missing graph is never a failure.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { checkProjectGuarded } from "../_run.js";

/** A client that answers every tool with a clean graph. */
const cleanClient = (tool) => {
  if (tool === "circular") {
    return { ok: true, value: { cycle_count: 0, cycles: [] } };
  }

  if (tool === "health") {
    return { ok: true, value: { quality_signal: 9000 } };
  }

  if (tool === "dead_code") {
    return { ok: true, value: { dead_code_count: 0, symbols: [] } };
  }

  if (tool === "diagnostics") {
    return { ok: true, value: { diagnostics: [] } };
  }

  return { ok: true, value: { match_count: 0, matches: [] } };
};

test("a clean graph passes every project check", () => {
  const result = checkProjectGuarded("/tmp/p", { probe: () => ({ available: true }), client: cleanClient, diagnostics: true });

  assert.equal(result.allPass, true);
  assert.equal(result.failCount, 0);
  assert.equal(result.skippedCount, 0);
});

test("the optional diagnostics check is skipped unless asked", () => {
  const result = checkProjectGuarded("/tmp/p", { probe: () => ({ available: true }), client: cleanClient });

  assert.equal(result.allPass, true);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.skipped[0].id, "project-diagnostics");
});

test("a cycle, a low health score, dead code and an unsafe pattern each fail", () => {
  const client = (tool) => {
    if (tool === "circular") {
      return { ok: true, value: { cycle_count: 2, cycles: [["src/a.js", "src/b.js"]] } };
    }

    if (tool === "health") {
      return { ok: true, value: { quality_signal: 5000 } };
    }

    if (tool === "dead_code") {
      return { ok: true, value: { dead_code_count: 3, symbols: [] } };
    }

    return { ok: true, value: { match_count: 1, matches: [], by_kind: { expect: 1 } } };
  };
  const result = checkProjectGuarded("/tmp/p", { probe: () => ({ available: true }), client });
  const ids = result.failed.map((entry) => entry.id);

  assert.equal(result.allPass, false);
  assert.deepEqual(ids, ["project-circular", "project-health", "project-dead-code", "project-unsafe-patterns"]);
});

test("a missing graph skips every check instead of failing", () => {
  const result = checkProjectGuarded("/tmp/p", { probe: () => ({ available: false }) });

  assert.equal(result.allPass, true);
  assert.equal(result.failCount, 0);
  assert.equal(result.skippedCount, result.total);
});

test("a failing tool call skips its check", () => {
  const client = () => ({ ok: false, unavailable: true, error: "boom" });
  const result = checkProjectGuarded("/tmp/p", { probe: () => ({ available: true }), client });

  assert.equal(result.allPass, true);
  assert.equal(result.skippedCount, result.total);
  assert.equal(result.skipped[0].reason, "boom");
});
