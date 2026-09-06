/**
 * @module test/cache-tiers
 *
 * R2: the normalized key, and knowing which tier answered.
 *
 * The cache keyed on the raw argument string, so "react button component" and
 * "a button component in React" were the same question and two entries. The
 * router already normalizes a prompt into tokens to score it; L1 keys on that,
 * so "what a prompt means" has one definition in this codebase.
 *
 * The measurement matters as much as the layer. P7 spent a phase optimizing the
 * wrong twelve percent because nobody had recorded where the weight was, so
 * every call now reports the tier that answered it and the path it arrived by.
 *
 * @see docs/plans/deterministic-cache.md - sections 3 and 8
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const stateDir = mkdtempSync(join(tmpdir(), "rule-tiers-"));
process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_CACHE;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";

const { cacheKey, normalizedKey, cacheLookup, cacheStore, cacheClear } = await import("../../src/core/tool-cache.js");
const { registerTool, callTool, entryPathOf } = await import("../../src/tools/router/index.js");

const result = (text) => ({ content: [{ type: "text", text }] });

// ── The normalized key ──

test("a rephrased prompt produces the same normalized key", () => {
  const a = normalizedKey("pix_tool", { prompt: "Svelte stores for shared state?" });
  const b = normalizedKey("pix_tool", { prompt: "svelte store for shared state" });

  assert.ok(a, "a prompt-shaped argument produces a normalized key");
  assert.equal(a, b, "the two phrasings are one question");
});

test("an interrogative opening does not fork the key", () => {
  assert.equal(
    normalizedKey("pix_tool", { prompt: "How do I use a container query?" }),
    normalizedKey("pix_tool", { prompt: "container queries" }),
  );
});

test("a field whose value reaches the output is not normalizable", async () => {
  // The reason, checked rather than assumed: `mode=search` prints the query in
  // its own heading, so replaying a stored answer for a rephrased query would
  // hand back a header for a question nobody asked.
  const { callTool: call } = await import("../../src/tools/router/index.js");
  const { loadAllSkills } = await import("../../src/core/skills.js");
  await loadAllSkills(true);

  const searched = await call("rule_tool_styleguide_css", { mode: "search", query: "zzmarkerzz container" });
  assert.ok(searched.content[0].text.includes("zzmarkerzz"), "search echoes its query verbatim");
  assert.equal(
    normalizedKey("rule_tool_styleguide_css", { query: "zzmarkerzz container" }),
    null,
    "so it must not get a normalized key",
  );

  const routed = await call("pix_tool", { prompt: "react button component" });
  assert.ok(normalizedKey("pix_tool", { prompt: "react button component" }), "the router's prompt is on the allowlist");
  assert.ok(routed.content[0].text.includes("rule-frontend-react"), "and it routed");
});

test("an answer that quotes the question gets no normalized entry", async () => {
  // The allowlist is necessary and not sufficient. `pix_tool` does not echo the
  // prompt when it routes confidently, and does echo it when it cannot: the
  // uncertain answer carries `No strong match for "<prompt>"`. Replaying that
  // for a differently worded question hands back a sentence about a prompt
  // nobody typed, and the uncertain answer is the least worth replaying.
  const { callTool: call } = await import("../../src/tools/router/index.js");
  cacheClear();

  const uncertain = await call("pix_tool", { prompt: "zzmarkerzz zzothermarkerzz" });
  assert.ok(uncertain.content[0].text.includes("zzmarkerzz"), "an uncertain route quotes the prompt");

  const rephrased = await call("pix_tool", { prompt: "zzothermarkerzz zzmarkerzz!" });
  assert.equal(rephrased._meta?.pixCache?.tier, undefined, "so the rephrasing must recompute");

  cacheClear();
  await call("pix_tool", { prompt: "svelte store for shared state" });
  const confident = await call("pix_tool", { prompt: "Svelte stores for shared state?" });
  assert.equal(confident._meta?.pixCache?.tier, "normalized", "a confident route does replay");
});

test("a non-prompt argument still changes the answer, so it stays in the key", () => {
  const base = { prompt: "react button", mode: "full" };
  assert.notEqual(
    normalizedKey("pix_tool", base),
    normalizedKey("pix_tool", { ...base, mode: "tldr" }),
    "an unrelated argument changes the output and must change the key",
  );
  assert.notEqual(normalizedKey("pix_tool", base), normalizedKey("pix_tool", { ...base, framework: "vue" }));
});

test("capitalization does not fork the key", () => {
  // The search tokenizer splits camelCase and emits the parts alongside the
  // whole token, so `TypeScript` produced three terms and `typescript` one.
  // Canonicalization must not, or the same question typed two ways is two keys.
  assert.equal(
    normalizedKey("pix_tool", { prompt: "TypeScript: any vs unknown?" }),
    normalizedKey("pix_tool", { prompt: "typescript any vs unknown" }),
  );
});

test("merging stays conservative: a content word is not dropped", () => {
  // Under-merging costs one miss. Over-merging replays an answer to a question
  // that was not asked, and the caller cannot tell.
  assert.notEqual(
    normalizedKey("pix_tool", { prompt: "build a react button component" }),
    normalizedKey("pix_tool", { prompt: "react button component" }),
  );
});

test("two tools never share a normalized key", () => {
  assert.notEqual(
    normalizedKey("pix_tool", { prompt: "react button" }),
    normalizedKey("rule_tool_gateway", { prompt: "react button" }),
  );
});

test("no normalizable argument means no normalized key", () => {
  assert.equal(normalizedKey("rule_tool_detect", { path: "." }), null, "nothing to normalize");
  assert.equal(normalizedKey("rule_tool_component", { component: "button" }), null);
  assert.equal(normalizedKey("pix_tool", { prompt: "the and for" }), null, "a prompt of only stopwords");
});

test("a non-cacheable tool has no key at either tier", () => {
  for (const tool of ["rule_tool_apply", "rule_tool_fix", "rule_tool_process_handon", "rule_tool_gateway"]) {
    assert.equal(cacheKey(tool, { prompt: "x" }), null, `${tool} must not be keyed`);
    assert.equal(normalizedKey(tool, { prompt: "x" }), null, `${tool} must not be keyed`);
  }
});

test("the normalized key cannot collide with the exact key", () => {
  const args = { prompt: "react button" };
  assert.notEqual(cacheKey("pix_tool", args), normalizedKey("pix_tool", args));
});

// ── Lookup and store report their tier ──

test("an identical call is an exact hit, a rephrased one is a normalized hit", () => {
  cacheClear();
  const args = { prompt: "svelte store for shared state" };
  cacheStore("pix_tool", args, result("stored"));

  assert.equal(cacheLookup("pix_tool", args)?.tier, "exact");
  assert.equal(cacheLookup("pix_tool", { prompt: "Svelte stores for shared state?" })?.tier, "normalized");
  assert.equal(cacheLookup("pix_tool", { prompt: "postgres index" }), undefined, "a different question misses");
});

test("both tiers return the same stored value", () => {
  cacheClear();
  const args = { prompt: "angular signals" };
  cacheStore("pix_tool", args, result("one answer"));

  assert.deepEqual(cacheLookup("pix_tool", { prompt: "Angular signal!" }).result, cacheLookup("pix_tool", args).result);
});

test("a stored result cannot be mutated through a lookup", () => {
  cacheClear();
  const args = { prompt: "vue composition api" };
  cacheStore("pix_tool", args, result("intact"));
  cacheLookup("pix_tool", args).result.content[0].text = "tampered";

  assert.equal(cacheLookup("pix_tool", args).result.content[0].text, "intact");
});

test("an error result is stored at neither tier", () => {
  cacheClear();
  const args = { prompt: "broken" };
  cacheStore("pix_tool", args, { isError: true, content: [{ type: "text", text: "no" }] });

  assert.equal(cacheLookup("pix_tool", args), undefined);
});

test("the opt-out disables every tier", () => {
  cacheClear();
  const args = { prompt: "react button" };
  cacheStore("pix_tool", args, result("stored"));
  process.env.RULE_MCP_NO_CACHE = "1";
  try {
    assert.equal(cacheLookup("pix_tool", args), undefined);
  } finally {
    delete process.env.RULE_MCP_NO_CACHE;
  }
});

// ── End to end through callTool ──

test("a rephrased prompt is served from cache without recomputing", async () => {
  const { callTool: call } = await import("../../src/tools/router/index.js");
  cacheClear();

  const first = await call("pix_tool", { prompt: "angular standalone component with signals" });
  assert.equal(first._meta?.pixCache?.tier, undefined, "the first call computes");

  const second = await call("pix_tool", { prompt: "Angular standalone components with signals?" });
  assert.equal(second._meta?.pixCache?.tier, "normalized");
  assert.equal(second.content[0].text, first.content[0].text, "and returns the same answer");
});

test("the tier is reported to the caller at every tier", async () => {
  const { callTool: call } = await import("../../src/tools/router/index.js");
  cacheClear();

  const miss = await call("pix_tool", { prompt: "vue 3 composition api component" });
  assert.equal(miss._meta?.pixCache, undefined, "a miss says nothing");

  const exact = await call("pix_tool", { prompt: "vue 3 composition api component" });
  assert.equal(exact._meta?.pixCache?.tier, "exact");

  const normalized = await call("pix_tool", { prompt: "Vue 3: composition API components?" });
  assert.equal(normalized._meta?.pixCache?.tier, "normalized");
});

test("a tool outside the allowlist gets L0 and nothing else", async () => {
  cacheClear();
  let runs = 0;
  registerTool({
    name: "rule_tool_tier_probe",
    description: "A probe tool for the tier tests, long enough to satisfy the description rule.",
    inputSchema: { type: "object", properties: { prompt: { type: "string" } } },
    handler: async () => {
      runs += 1;
      return result(`ran ${runs}`);
    },
  });

  await callTool("rule_tool_tier_probe", { prompt: "react button component" });
  await callTool("rule_tool_tier_probe", { prompt: "react button component" });
  assert.equal(runs, 1, "an identical call still replays");

  await callTool("rule_tool_tier_probe", { prompt: "React button components?" });
  assert.equal(runs, 2, "a rephrasing recomputes, because the tool is not allowlisted");
});

// ── The entry path, which is what R8 is gated on ──

test("every call is classified by the path it arrived on", () => {
  assert.equal(entryPathOf("pix_tool"), "router");
  assert.equal(entryPathOf("rule_tool_gateway"), "gateway");
  assert.equal(entryPathOf("rule_tool_frontend_react"), "skill");
  assert.equal(entryPathOf("rule_tool_styleguide_css"), "skill");
  assert.equal(entryPathOf("rule_tool_check"), "action");
  assert.equal(entryPathOf("rule_tool_process_handon"), "action");
});

// ── Aggregation reports both facets ──

test("the aggregate reports hit rate per tier and calls per entry path", async () => {
  const { aggregate } = await import("../../src/core/telemetry-stats.js");
  const stats = aggregate([
    { tool: "pix_tool", cacheHit: false, cacheTier: "miss", entry: "router" },
    { tool: "pix_tool", cacheHit: true, cacheTier: "exact", entry: "router" },
    { tool: "pix_tool", cacheHit: true, cacheTier: "normalized", entry: "router" },
    { tool: "rule_tool_frontend_react", cacheHit: true, cacheTier: "exact", entry: "skill" },
  ]);

  assert.deepEqual(stats.byTier, { miss: 1, exact: 2, normalized: 1 });
  assert.deepEqual(stats.byEntry, { router: 3, skill: 1 });
  assert.equal(stats.cacheHitRate, 0.75);
});

test("the rendered report names the tiers and the entry paths", async () => {
  const { aggregate, renderStats } = await import("../../src/core/telemetry-stats.js");
  const text = renderStats(
    aggregate([
      { tool: "pix_tool", cacheHit: true, cacheTier: "normalized", entry: "router" },
      { tool: "rule_tool_frontend_react", cacheHit: false, cacheTier: "miss", entry: "skill" },
    ]),
  );

  assert.match(text, /normalized/);
  assert.match(text, /skill/);
});

// ── The number, held at a floor ──

test("a rephrased corpus mostly replays, and L0 alone cannot do it", async () => {
  const { callTool: call } = await import("../../src/tools/router/index.js");
  const { CORPUS } = await import("../fixtures/routing-corpus.mjs");

  const rephrase = (prompt) => {
    const words = prompt.trim().split(/\s+/);
    const last = words.at(-1);
    const plural = /[a-z]$/.test(last) && !last.endsWith("s") ? `${last}s` : last;

    return `How do I ${[...words.slice(0, -1), plural].join(" ")}?`;
  };

  const run = async () => {
    cacheClear();
    for (const entry of CORPUS) {
      await call("pix_tool", { prompt: entry.prompt });
    }
    let replayed = 0;
    for (const entry of CORPUS) {
      const result = await call("pix_tool", { prompt: rephrase(entry.prompt) });
      if (result?._meta?.pixCache?.tier) {
        replayed += 1;
      }
    }

    return replayed / CORPUS.length;
  };

  const withL1 = await run();

  process.env.RULE_MCP_CACHE_EXACT_ONLY = "1";
  let withoutL1;
  try {
    withoutL1 = await run();
  } finally {
    delete process.env.RULE_MCP_CACHE_EXACT_ONLY;
  }

  console.log(`  rephrased corpus: ${Math.round(withoutL1 * 100)}% with L0 only, ${Math.round(withL1 * 100)}% with L1`);
  assert.equal(withoutL1, 0, "L0 cannot answer a rephrasing, by construction");
  assert.ok(withL1 >= 0.8, `L1 must replay most of a rephrased corpus, got ${Math.round(withL1 * 100)}%`);
});

// ── L2, and why there is no L2 ──

test("no tier above the normalized key is wired in", async () => {
  // The plan's gate for a similarity tier was that wrong replays must be zero.
  // Measured over 224 rephrasings the normalized key cannot answer, no threshold
  // both replays something and replays it correctly: 0.90 replays nothing, 0.85
  // is 13% wrong, 0.80 is 16% wrong. ADR 056 has the reasoning, and
  // scripts/cache-similarity-report.mjs reproduces the number.
  //
  // This test exists so the absence is deliberate rather than forgotten. If a
  // future tier lands, it changes this assertion and has to bring a report
  // showing a threshold with zero wrong replays and a non-zero hit count.
  const { cacheLookup: lookup } = await import("../../src/core/tool-cache.js");
  const TIERS = new Set(["exact", "normalized"]);
  cacheClear();

  const args = { prompt: "svelte store for shared state" };
  cacheStore("pix_tool", args, result("stored"));

  for (const probe of [args, { prompt: "Svelte stores for shared state?" }]) {
    const tier = lookup("pix_tool", probe)?.tier;
    assert.ok(TIERS.has(tier), `unexpected tier ${tier}: a new tier needs its own report`);
  }

  // A prompt that only overlaps must miss, not approximate.
  assert.equal(
    lookup("pix_tool", { prompt: "store for state" }),
    undefined,
    "partial overlap must miss: replaying it is the wrong replay the report measured",
  );
});

process.on("exit", () => rmSync(stateDir, { recursive: true, force: true }));
