/** verifyCache and the priming floors: disabled cache, bad entries, drift. */
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";

import {
  MIN_HITS,
  SKILL,
  args,
  cacheClear,
  cacheEntries,
  cacheLookup,
  cacheStore,
  primeFromCatalog,
  project,
  result,
  skillDigest,
  verifyCache,
  writeCatalog,
} from "./_catalog.fixture.mjs";

beforeEach(() => {
  cacheClear();
});

async function readyEntry(tool = "pix_tool", entryArgs = args("react button"), text = "verified") {
  cacheStore(tool, entryArgs, result(text), { [SKILL]: skillDigest(SKILL) });
  for (let index = 0; index < MIN_HITS; index++) {
    cacheLookup(tool, entryArgs);
  }
  await new Promise((resolve) => setImmediate(resolve));

  return { tool, entryArgs, text };
}

test("primeFromCatalog skips entries without a tool or a result", () => {
  const catalog = {
    version: 1,
    generatedAt: "2026-09-01",
    serverVersion: "test",
    entries: [{ result: result("no tool") }, { tool: 42, result: result("bad tool") }, { tool: "pix_tool", args: args("rule ui"), result: result("good") }],
  };
  writeCatalog(project, catalog);

  const { loaded, skipped } = primeFromCatalog(project);
  assert.equal(loaded, 1, "the well-formed entry primes");
  assert.equal(skipped, 2, "the malformed entries are skipped");
  cacheClear();
});

test("verifyCache reports drift, failures and skips together", async () => {
  const { tool, entryArgs } = await readyEntry("pix_tool", args("react button"), "blessed");

  const verify = await verifyCache({
    recompute: (name, candidateArgs) => (name === "pix_tool" && candidateArgs.prompt === "react button" ? result("blessed") : result("different")),
    canRun: (name) => name === "pix_tool",
  });

  assert.equal(verify.checked, 1, "one fresh entry is checked");
  assert.deepEqual(verify.drifted, [], "identical bytes are not drift");
  assert.deepEqual(verify.failed, [], "no failures");
  assert.equal(cacheEntries().length >= 1, true, "the entry is still in the cache");
});

test("verifyCache flags a changed recompute as drift", async () => {
  const { tool, entryArgs } = await readyEntry("pix_tool", args("react button"), "blessed");

  const verify = await verifyCache({ recompute: () => result("rewritten elsewhere") });

  assert.equal(verify.drifted.length, 1, "the recomputed answer differs");
  assert.equal(verify.drifted[0].tool, "pix_tool", "drift names the tool");
});

test("verifyCache records recompute failures and refuses to run some tools", async () => {
  const { tool, entryArgs } = await readyEntry("pix_tool", args("react button"), "blessed");

  const verify = await verifyCache({
    recompute: () => {
      throw new Error("upstream down");
    },
    canRun: (name) => name !== "rule_tool_check",
  });

  assert.equal(verify.failed.length, 1, "the thrown recompute is recorded");
  assert.equal(verify.failed[0].error, "upstream down", "the error message is kept");
  assert.equal(verify.skipped, 0, "no tool was refused");
});

test("verifyCache skips entries the canRun gate refuses and stale entries", async () => {
  const { tool } = await readyEntry("pix_tool", args("react button"), "blessed");
  await readyEntry("rule_tool_check", args("clean code"), "checked");

  const verify = await verifyCache({ recompute: () => result("same"), canRun: (name) => name === "pix_tool" });

  assert.equal(verify.skipped, 1, "the gate refuses rule_tool_check");
  assert.equal(verify.checked, 1, "pix_tool is verified");
});
