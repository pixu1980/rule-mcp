// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** Which skills an answer depends on, per entry path. */
import test from "node:test";
import assert from "node:assert/strict";
import { REAL_SKILL, callTool, dependenciesOf, result, skillDigest } from "./_invalidation.fixture.mjs";

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
  const deps = dependenciesOf("pix_tool_styleguide_css", { mode: "full" }, result("x"));

  assert.deepEqual(Object.keys(deps), ["pix-styleguide-css"]);
});

test("a check depends on the skill it checked", () => {
  const deps = dependenciesOf("pix_tool_check", { skill: "pix-styleguide-css", code: "a{}" }, result("x"));

  assert.deepEqual(Object.keys(deps), ["pix-styleguide-css"]);
});

test("a template tool depends on no skill", () => {
  assert.deepEqual(dependenciesOf("pix_tool_styleguide", { component: "button" }, result("x")), {});
  assert.deepEqual(dependenciesOf("pix_tool_compress", { text: "x" }, result("x")), {});
});

test("a tool whose dependencies cannot be attributed depends on all of them", async () => {
  const { getSkillNames } = await import("../../../tools/router/index.js");
  const deps = dependenciesOf("pix_tool_search", { query: "container query" }, result("x"));

  assert.equal(Object.keys(deps).length, getSkillNames().length, "a full-text search across the corpus genuinely depends on the corpus");
});
