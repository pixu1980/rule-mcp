/** The cached core is identity-free, and verify recomputes without counting as use. */
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { args, cacheClear, cacheEntries, cacheStore, result, verifyCache } from "./_catalog.fixture.mjs";

beforeEach(() => {
  cacheClear();
});

// ── The reason verify exists ──

test("the cached core carries no per-call identity", async () => {
  const { postprocessToolResult, stampRequestId } = await import("../../../src/core/enforcement/index.js");
  const core = postprocessToolResult("rule_tool_search", { query: "x" }, result("found"));

  assert.equal(core._meta.pixEnforcement.requestId, undefined, "a fresh id in the core makes two runs of the same call differ, and a replay hand back an older call's id");
  assert.equal(JSON.stringify(core), JSON.stringify(postprocessToolResult("rule_tool_search", { query: "x" }, result("found"))));

  const stamped = stampRequestId(core, "test-id");
  assert.equal(stamped._meta.pixEnforcement.requestId, "test-id", "it is stamped after the cache instead");
  assert.notEqual(
    stampRequestId(core)._meta.pixEnforcement.requestId,
    stampRequestId(core)._meta.pixEnforcement.requestId,
    "and two stamps of the same core are two different calls",
  );
});

// ── The honesty check ──

test("verifying does not count as using", async () => {
  cacheStore("pix_tool", args("counted"), result("same"), {});

  await verifyCache({ recompute: () => result("same") });

  const hits = cacheEntries().reduce((sum, entry) => sum + entry.hits, 0);
  assert.equal(hits, 0, "an entry must not earn promotion by being verified");
});

test("verify recomputes every entry and names the ones that drifted", async () => {
  cacheStore("pix_tool", args("stable"), result("same"), {});
  cacheStore("pix_tool", args("drifted"), result("was this"), {});

  const report = await verifyCache({
    recompute: (tool, callArguments) => (callArguments.prompt === "drifted" ? result("is now that") : result("same")),
  });

  assert.equal(report.checked, 2);
  assert.equal(report.drifted.length, 1);
  assert.equal(report.drifted[0].args.prompt, "drifted");
});
