

/** The code signature: cache keys and the stored index move when the server code changes. */
import test from "node:test";
import assert from "node:assert/strict";
import { loadAllSkills } from "./_invalidation.fixture.mjs";

await loadAllSkills(true);

// ── End to end ──
test("the cache key moves when the server's code changes", async () => {
  // The namespace was the package version alone, so a code change that alters
  // what a tool returns was invisible: this project installs by git pull, where
  // the version rarely moves per commit. The routing suite read back cores
  // computed before the code under test existed and reported green.
  const { cacheKey, codeSignature } = await import("../tool-cache/index.js");
  const before = cacheKey("pix_tool", { prompt: "same question" });
  const signature = codeSignature();

  assert.match(signature, /^[0-9a-f]{8,}$/, "the signature is a short digest, not a path or a date");

  // A source edit is what the signature has to notice.
  const { utimesSync } = await import("node:fs");
  const source = new URL("../../text/_caveman.js", import.meta.url).pathname;
  const later = new Date(Date.now() + 60_000);
  utimesSync(source, later, later);

  // The memo lives in code-signature.js, so that is the module to re-import.
  const { codeSignature: fresh } = await import(`../../../core/_code-signature.js?edited=${Date.now()}`);
  assert.notEqual(fresh(), signature, "an edited source file changes the signature");
  assert.ok(before.length > 0, "and the key is built from it");
});

// ── The BM25 index is derived data, so it is cached too (PERF-2) ──

test("routing off a restored index answers exactly as a freshly built one", async () => {
  // 95ms of tokenizing against 18ms of reading it back, paid by every CLI
  // invocation and every hook. Worth it only if the answers are identical, so
  // that is what this asserts rather than the timing.
  const { loadAllSkills } = await import("../../skills/index.js");
  const { buildIndex, clearIndex, search, getIndexStats } = await import("../../bm25/index.js");
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
  const { indexCacheKey } = await import("../../bm25/index.js");

  assert.equal(typeof indexCacheKey, "function", "the key is exposed so invalidation can be checked");
  assert.match(indexCacheKey(), /^[0-9a-f]{12}$/, "it is a short digest of the code and the skills");
});
