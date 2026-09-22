

/** Skill digests and entry survival: unchanged stays, changed or vanished drops. */
import test from "node:test";
import assert from "node:assert/strict";
import { REAL_SKILL, cacheClear, cacheEntries, cacheLookup, cacheStore, result, skillDigest } from "./_invalidation.fixture.mjs";

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
  cacheStore("rule_tool_styleguide", args, result("template"), {});

  assert.equal(cacheLookup("rule_tool_styleguide", args)?.result.content[0].text, "template");
});

test("a dropped entry is actually removed, not merely hidden", () => {
  cacheClear();
  const args = { prompt: "react button component" };
  cacheStore("pix_tool", args, result("stale"), { [REAL_SKILL]: "0000000000000000" });
  assert.equal(cacheLookup("pix_tool", args), undefined);

  assert.equal(cacheEntries().length, 0, "the stale entry is evicted on the miss that found it");
});
