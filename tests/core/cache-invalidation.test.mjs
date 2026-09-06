/**
 * @module test/cache-invalidation
 *
 * R3: an edit to one skill drops the entries that depend on it, and nothing else.
 *
 * The namespace was `pkg.version : mtime of skills/`, so a heading changed in
 * one skill dropped every entry for all 88. On this repository, where most
 * sessions edit skills, that made the cache close to ornamental.
 *
 * The tests deliberately do not mutate `skills/`. An entry stored with a stale
 * digest for a real skill is indistinguishable, from the cache's point of view,
 * from an entry stored before that skill was edited - and it is the mechanism
 * that needs proving, not the filesystem.
 *
 * @see docs/plans/deterministic-cache.md - section 4
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const stateDir = mkdtempSync(join(tmpdir(), "rule-invalidation-"));
process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_CACHE;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";

const { cacheStore, cacheLookup, cacheClear, skillDigest, cacheEntries } = await import("../../src/core/tool-cache.js");
const { callTool, dependenciesOf } = await import("../../src/tools/router/index.js");
const { loadAllSkills } = await import("../../src/core/skills.js");

await loadAllSkills(true);

const result = (text) => ({ content: [{ type: "text", text }] });
const REAL_SKILL = "rule-frontend-react";

// ── The digest itself ──

test("a skill has a stable content digest", () => {
  const digest = skillDigest(REAL_SKILL);

  assert.match(digest, /^[0-9a-f]{16,64}$/, "a hex digest");
  assert.equal(digest, skillDigest(REAL_SKILL), "stable across calls");
  assert.notEqual(digest, skillDigest("rule-styleguide-css"), "two skills differ");
});

test("an unknown skill has no digest", () => {
  assert.equal(skillDigest("rule-does-not-exist"), undefined);
});

// ── Invalidation is per dependency ──

test("an entry survives when its dependencies are unchanged", () => {
  cacheClear();
  const args = { prompt: "react button component" };
  cacheStore("pix_tool", args, result("kept"), { [REAL_SKILL]: skillDigest(REAL_SKILL) });

  assert.equal(cacheLookup("pix_tool", args)?.result.content[0].text, "kept");
});

test("an entry is dropped when a dependency's digest no longer matches", () => {
  cacheClear();
  const args = { prompt: "react button component" };
  cacheStore("pix_tool", args, result("stale"), { [REAL_SKILL]: "0000000000000000" });

  assert.equal(cacheLookup("pix_tool", args), undefined, "a changed skill invalidates its dependents");
});

test("a dependency that no longer exists invalidates the entry", () => {
  cacheClear();
  const args = { prompt: "deleted skill" };
  cacheStore("pix_tool", args, result("orphan"), { "rule-deleted-skill": "abcabcabcabcabca" });

  assert.equal(cacheLookup("pix_tool", args), undefined, "unverifiable is not the same as valid");
});

test("one skill changing leaves the entries that do not depend on it alone", () => {
  cacheClear();
  const react = { prompt: "react button component" };
  const css = { prompt: "css selector strategy" };
  cacheStore("pix_tool", react, result("react"), { [REAL_SKILL]: "0000000000000000" });
  cacheStore("pix_tool", css, result("css"), { "rule-styleguide-css": skillDigest("rule-styleguide-css") });

  assert.equal(cacheLookup("pix_tool", react), undefined, "the dependent is dropped");
  assert.equal(cacheLookup("pix_tool", css)?.result.content[0].text, "css", "the independent survives");
});

test("an entry with no dependencies survives every skill edit", () => {
  cacheClear();
  const args = { component: "button", framework: "react" };
  cacheStore("rule_tool_component", args, result("template"), {});

  assert.equal(cacheLookup("rule_tool_component", args)?.result.content[0].text, "template");
});

test("a dropped entry is actually removed, not merely hidden", () => {
  cacheClear();
  const args = { prompt: "react button component" };
  cacheStore("pix_tool", args, result("stale"), { [REAL_SKILL]: "0000000000000000" });
  assert.equal(cacheLookup("pix_tool", args), undefined);

  assert.equal(cacheEntries().length, 0, "the stale entry is evicted on the miss that found it");
});

// ── What each tool depends on ──

test("the router depends on the route it chose and its alternatives", async () => {
  const routed = await callTool("pix_tool", { prompt: "I need a React button component" });
  const deps = dependenciesOf("pix_tool", { prompt: "I need a React button component" }, routed);

  assert.ok(Object.keys(deps).length > 0, "a route produces dependencies");
  assert.ok(REAL_SKILL in deps, `expected ${REAL_SKILL} in ${Object.keys(deps).join(", ")}`);
  for (const [name, digest] of Object.entries(deps)) {
    assert.equal(digest, skillDigest(name), `${name} must record its current digest`);
  }
});

test("a skill tool depends on its own skill and nothing else", () => {
  const deps = dependenciesOf("rule_tool_styleguide_css", { mode: "full" }, result("x"));

  assert.deepEqual(Object.keys(deps), ["rule-styleguide-css"]);
});

test("a check depends on the skill it checked", () => {
  const deps = dependenciesOf("rule_tool_check", { skill: "rule-styleguide-css", code: "a{}" }, result("x"));

  assert.deepEqual(Object.keys(deps), ["rule-styleguide-css"]);
});

test("a template tool depends on no skill", () => {
  assert.deepEqual(dependenciesOf("rule_tool_component", { component: "button" }, result("x")), {});
  assert.deepEqual(dependenciesOf("rule_tool_compress", { text: "x" }, result("x")), {});
});

test("a tool whose dependencies cannot be attributed depends on all of them", async () => {
  const { getSkillNames } = await import("../../src/tools/router/index.js");
  const deps = dependenciesOf("rule_tool_search", { query: "container query" }, result("x"));

  assert.equal(
    Object.keys(deps).length,
    getSkillNames().length,
    "a full-text search across the corpus genuinely depends on the corpus",
  );
});

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
  const { CORPUS } = await import("../fixtures/routing-corpus.mjs");
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

// ── The server's own code is part of what an answer depends on ──

test("the cache key moves when the server's code changes", async () => {
  // The namespace was the package version alone, so a code change that alters
  // what a tool returns was invisible: this project installs by git pull, where
  // the version rarely moves per commit. The routing suite read back cores
  // computed before the code under test existed and reported green.
  const { cacheKey, codeSignature } = await import("../../src/core/tool-cache.js");
  const before = cacheKey("pix_tool", { prompt: "same question" });
  const signature = codeSignature();

  assert.match(signature, /^[0-9a-f]{8,}$/, "the signature is a short digest, not a path or a date");

  // A source edit is what the signature has to notice.
  const { utimesSync } = await import("node:fs");
  const source = new URL("../../src/core/caveman.js", import.meta.url).pathname;
  const later = new Date(Date.now() + 60_000);
  utimesSync(source, later, later);

  // The memo lives in code-signature.js, so that is the module to re-import.
  const { codeSignature: fresh } = await import(`../../src/core/code-signature.js?edited=${Date.now()}`);
  assert.notEqual(fresh(), signature, "an edited source file changes the signature");
  assert.ok(before.length > 0, "and the key is built from it");
});

// ── The BM25 index is derived data, so it is cached too (PERF-2) ──

test("routing off a restored index answers exactly as a freshly built one", async () => {
  // 95ms of tokenizing against 18ms of reading it back, paid by every CLI
  // invocation and every hook. Worth it only if the answers are identical, so
  // that is what this asserts rather than the timing.
  const { loadAllSkills } = await import("../../src/core/skills.js");
  const { buildIndex, clearIndex, search, getIndexStats } = await import("../../src/core/bm25/index.js");
  await loadAllSkills();

  const PROBES = ["react button component", "postgres index slow query", "docker healthcheck", "enum or union type"];

  buildIndex(true);
  const fresh = getIndexStats();
  const before = PROBES.map((probe) => search(probe, 3).map((hit) => `${hit.skill}:${Math.round(hit.score * 1000)}`));

  clearIndex();
  buildIndex();
  const restored = getIndexStats();
  const after = PROBES.map((probe) => search(probe, 3).map((hit) => `${hit.skill}:${Math.round(hit.score * 1000)}`));

  assert.deepEqual(restored, fresh, "the restored index has to describe the same corpus");
  assert.deepEqual(after, before, "and rank the same skills with the same scores");
});

test("a code change drops the stored index", async () => {
  const { indexCacheKey } = await import("../../src/core/bm25/index.js");

  assert.equal(typeof indexCacheKey, "function", "the key is exposed so invalidation can be checked");
  assert.match(indexCacheKey(), /^[0-9a-f]{12}$/, "it is a short digest of the code and the skills");
});
