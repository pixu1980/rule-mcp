/** verifyCache skips entries that cannot be checked: tool-less, unrunnable, repeated, stale. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { SKILL, args, cacheClear, project, result, writeCatalog } from "./_catalog.fixture.mjs";

const { cacheKey } = await import("../../tool-cache/index.js");
const { cacheState } = await import("../../tool-cache/_state.js");
const { primeFromCatalog, verifyCache } = await import("../_prime.js");

test("a catalog entry without a tool or result is skipped, not primed", () => {
  writeCatalog(project, {
    version: 1,
    generatedAt: "2026-09-01",
    serverVersion: "test",
    entries: [{ tool: "rule_tool" }, { args: args("ghost") }, { tool: "rule_tool", args: args("live"), dependsOn: {}, result: result("live") }],
  });

  const { loaded, skipped } = primeFromCatalog(project);

  assert.equal(loaded, 1, "the complete entry primes");
  assert.equal(skipped, 2, "the tool-less and result-less entries skip");
});

test("verifyCache skips tool-less, unrunnable, repeated and stale entries", async () => {
  cacheClear();

  // Freshness resolves entries by their real key, so the fresh and stale
  // entries live under theirs; the twin shares the same identity string
  // under another key to exercise the already-seen skip.
  const dupArgs = args("dup");
  const keys = [cacheKey("rule_tool", dupArgs), "verify-dup", cacheKey("rule_tool", args("stale")), "verify-bare"];
  cacheState.store.set(keys[0], { tool: "rule_tool", args: dupArgs, result: result("dup"), deps: {} });
  cacheState.store.set(keys[1], { tool: "rule_tool", args: dupArgs, result: result("dup"), deps: {} });
  cacheState.store.set(keys[2], { tool: "rule_tool", args: args("stale"), result: result("stale"), deps: { [SKILL]: "moved" } });
  cacheState.store.set(keys[3], { result: undefined, deps: {} });

  try {
    const skipped = await verifyCache({ recompute: () => result("same"), canRun: () => false });
    assert.equal(skipped.checked, 0, "nothing runnable means nothing checked");

    const report = await verifyCache({ recompute: () => result("dup") });
    assert.equal(report.checked, 1, "the fresh entry is verified once, its twin is deduplicated");
    assert.ok(report.skipped >= 1, "the stale entry is skipped, not drifted");
    assert.deepEqual(report.drifted, [], "identical recomputes do not drift");
  } finally {
    for (const key of keys) {
      cacheState.store.delete(key);
    }
  }
});
