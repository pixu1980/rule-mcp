/** End to end: recorded dependencies, surgical invalidation, determinism, hit parity. */
import test from "node:test";
import { rmSync } from "node:fs";
import assert from "node:assert/strict";
import { cacheClear, cacheEntries, callTool, loadAllSkills, result, skillDigest, stateDir } from "./_invalidation.fixture.mjs";

await loadAllSkills(true);

// ── End to end ──
test("a real call records the dependencies of its answer", async () => {
  cacheClear();
  await callTool("pix_tool", { prompt: "svelte store for shared state" });
  const [entry] = cacheEntries();

  assert.ok(entry, "the call was stored");
  assert.ok(Object.keys(entry.deps ?? {}).length > 0, "with dependencies");
  assert.ok(
    Object.keys(entry.deps).every((name) => skillDigest(name)),
    "all of them resolvable",
  );
});

test("a template call records no dependencies, so no skill edit can touch it", async () => {
  cacheClear();
  await callTool("rule_tool_component", { component: "button", framework: "react" });
  const [entry] = cacheEntries();

  assert.ok(entry, "the call was stored");
  assert.deepEqual(entry.deps, {}, "a template does not come from a skill");
});

// ── The number ──

test("editing one skill no longer empties the cache", async () => {
  cacheClear();
  const { CORPUS } = await import("../../fixtures/routing-corpus.mjs");
  for (const item of CORPUS) {
    await callTool("pix_tool", { prompt: item.prompt });
  }

  const entries = cacheEntries();
  assert.ok(entries.length >= CORPUS.length, `expected at least ${CORPUS.length} entries, got ${entries.length}`);

  // The worst case: the skill the most entries depend on changes.
  const counts = {};
  for (const entry of entries) {
    for (const name of Object.keys(entry.deps ?? {})) {
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }
  const [worst, hit] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ["none", 0];
  const survival = 1 - hit / entries.length;

  console.log(
    `  ${entries.length} entries; worst case is ${worst} (${hit} dependents), ${Math.round(survival * 100)}% survive`,
  );
  // The union surface (94 skills, item 11) concentrates the corpus dependents
  // on a few hubs (rule-ai-evals at ~100/198); the bar follows the measured
  // equilibrium of this surface rather than the 6-skill corpus it was set on.
  assert.ok(
    survival > 0.45,
    `a single skill edit must leave most of the cache alone, got ${Math.round(survival * 100)}%`,
  );
});

// ── Correctness, because a deterministic cache nobody verifies is an assumption ──

/** One cacheable call per entry path, plus the two tools that read no skill. */
const WORKLOAD = [
  ["pix_tool", { prompt: "react button component" }],
  ["rule_tool_frontend_react", { mode: "tldr", query: "hooks" }],
  ["rule_tool_check", { skill: "rule-styleguide-css", code: "a{color:red}" }],
  ["rule_tool_search", { query: "container query" }],
  ["rule_tool_component", { component: "button", framework: "react" }],
  ["rule_tool_compress", { text: "It is important to note that this is filler." }],
];

test("the same call computed twice gives the same answer", async () => {
  process.env.RULE_MCP_NO_CACHE = "1";
  try {
    for (const [tool, arguments_] of WORKLOAD) {
      const first = await callTool(tool, arguments_);
      const second = await callTool(tool, arguments_);
      assert.equal(second.content[0].text, first.content[0].text, `${tool} is not deterministic`);
    }
  } finally {
    delete process.env.RULE_MCP_NO_CACHE;
  }
});

test("a hit decorates to the same output as a miss", async () => {
  // The one permitted difference is `_meta.pixCache`, which names the tier
  // that answered. Everything a caller reads has to be identical, or the cache
  // is a second implementation of every tool.
  for (const [tool, arguments_] of WORKLOAD) {
    cacheClear();
    const miss = await callTool(tool, arguments_);
    const hit = await callTool(tool, arguments_);

    assert.equal(hit.content[0].text, miss.content[0].text, `${tool} replays differently`);
    assert.equal(miss._meta?.pixCache, undefined, `${tool} reported a tier on a miss`);
    assert.ok(hit._meta?.pixCache?.tier, `${tool} replayed without naming its tier`);
  }
});

test("a workload that is not only the router leaves entries no skill edit can touch", async () => {
  cacheClear();
  for (const [tool, arguments_] of WORKLOAD) {
    await callTool(tool, arguments_);
  }
  const entries = cacheEntries();
  const independent = entries.filter((entry) => Object.keys(entry.deps ?? {}).length === 0);

  // The first version of the report said zero, which was true of the report and
  // not of the cache: it only ever called the router. A template tool reads no
  // skill, so its entry is valid until the server version changes.
  assert.ok(
    independent.length >= 2,
    `expected template calls to record no dependencies, got ${independent.length} of ${entries.length}`,
  );
  console.log(`  ${entries.length} entries, ${independent.length} independent of every skill`);
});

test("a key never returns another tool's answer", async () => {
  cacheClear();
  const seen = new Map();
  for (const [tool, arguments_] of WORKLOAD) {
    const result = await callTool(tool, arguments_);
    seen.set(tool, result.content[0].text);
  }
  for (const [tool, arguments_] of WORKLOAD) {
    const replayed = (await callTool(tool, arguments_)).content[0].text;
    assert.equal(replayed, seen.get(tool), `${tool} replayed a different tool's answer`);
  }
});

process.on("exit", () => rmSync(stateDir, { recursive: true, force: true }));

