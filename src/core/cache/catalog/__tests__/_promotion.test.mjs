/** Promotion: reuse counted, three hits earn export, drift and paths never leave. */
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MIN_HITS, SKILL, args, buildCatalog, cacheClear, cacheEntries, cacheLookup, cacheStore, promotableEntries, result, skillDigest } from "./_catalog.fixture.mjs";

beforeEach(() => {
  cacheClear();
});

// ── What an entry has to remember ──

test("an entry records what it would take to run it again", () => {
  cacheStore("rule_tool", args("react button"), result("routed"), { [SKILL]: skillDigest(SKILL) });
  const [entry] = cacheEntries();

  assert.equal(entry.tool, "rule_tool", "the tool that produced it");
  assert.deepEqual(entry.args, { prompt: "react button" }, "and the arguments it was given");
  assert.equal(entry.hits, 0, "a stored entry has not been reused yet");
});

test("a hit is counted, a miss is not", () => {
  cacheStore("rule_tool", args("react button"), result("routed"), {});
  cacheLookup("rule_tool", args("react button"));
  cacheLookup("rule_tool", args("react button"));
  cacheLookup("rule_tool", args("nothing stored for this"));

  const hits = cacheEntries().reduce((sum, entry) => sum + entry.hits, 0);
  assert.equal(hits, 2, "two hits, and the miss counts for nothing");
});

// ── Promotion ──

test("promotion takes three reuses, because once is an accident", () => {
  cacheStore("rule_tool", args("react button"), result("routed"), {});
  for (let index = 0; index < MIN_HITS - 1; index++) {
    cacheLookup("rule_tool", args("react button"));
  }
  assert.deepEqual(promotableEntries(), [], `${MIN_HITS - 1} reuses is not enough`);

  cacheLookup("rule_tool", args("react button"));
  assert.equal(promotableEntries().length, 1, `${MIN_HITS} reuses promotes it`);
});

test("an entry that no longer reproduces is dropped, not exported", async () => {
  cacheStore("rule_tool", args("stable"), result("same"), {});
  cacheStore("rule_tool", args("drifted"), result("was this"), {});
  for (const prompt of ["stable", "drifted"]) {
    for (let index = 0; index < MIN_HITS; index++) {
      cacheLookup("rule_tool", args(prompt));
    }
  }

  const { catalog, promoted, dropped } = await buildCatalog({
    recompute: (tool, callArguments) => (callArguments.prompt === "drifted" ? result("is now that") : result("same")),
  });

  assert.equal(promoted.length, 1, "only the entry that still reproduces is promoted");
  assert.equal(catalog.entries[0].args.prompt, "stable");
  assert.equal(dropped.length, 1, "and the drifted one is reported rather than silently skipped");
  assert.equal(dropped[0].reason, "unstable");
});

test("an absolute path never reaches the catalog", async () => {
  cacheStore("rule_tool_gateway_core", { prompt: "x", path: "/Users/someone/projects/thing" }, result("core"), {});
  for (let index = 0; index < MIN_HITS; index++) {
    cacheLookup("rule_tool_gateway_core", { prompt: "x", path: "/Users/someone/projects/thing" });
  }

  const { catalog, dropped } = await buildCatalog({ recompute: () => result("core") });

  assert.equal(catalog.entries.length, 0, "the entry is not exported");
  assert.equal(dropped[0]?.reason, "local-path", "and the reason says why");
  assert.equal(JSON.stringify(catalog).includes("/Users/"), false, "nothing path-shaped survives");
});

// ── The file ──

test("the same cache exports byte-identical catalogs", async () => {
  for (const prompt of ["b second", "a first"]) {
    cacheStore("rule_tool", args(prompt), result(prompt), {});
    for (let index = 0; index < MIN_HITS; index++) {
      cacheLookup("rule_tool", args(prompt));
    }
  }
  const options = { recompute: (tool, callArguments) => result(callArguments.prompt), now: "2026-09-01" };

  const first = await buildCatalog(options);
  const second = await buildCatalog(options);

  assert.equal(JSON.stringify(first.catalog), JSON.stringify(second.catalog), "no run-to-run variation");
  assert.deepEqual(
    first.catalog.entries.map((entry) => entry.args.prompt),
    ["a first", "b second"],
    "entries are sorted, so a diff shows a change rather than a reshuffle",
  );
});
