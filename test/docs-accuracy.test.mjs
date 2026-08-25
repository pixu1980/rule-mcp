/**
 * docs-accuracy.test.mjs
 *
 * The README advertises tool/resource/prompt/skill counts. Nothing verified
 * them, so every removal (e.g. the architect split) silently left stale
 * claims behind. This test computes the REAL surface at runtime and fails
 * whenever README.md disagrees - edit one, the other must follow.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const actual = {};
{
  const { loadAllSkills } = await import("../src/core/skills.js");
  await loadAllSkills(true);
  const { listTools } = await import("../src/tools/router.js");
  const { listResources } = await import("../src/resources/index.js");
  const { listPrompts } = await import("../src/prompts/index.js");
  const len = (r) => (Array.isArray(r) ? r.length : (r.tools ?? r.resources ?? r.prompts).length);
  actual.tools = len(await listTools({}));
  actual.resources = len(await listResources({}));
  actual.prompts = len(await listPrompts());
  actual.skills = readdirSync(new URL("../skills", import.meta.url)).filter((d) => d.startsWith("rule-")).length;
}

const README = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8");

test("README advertises the real tool count", () => {
  assert.match(README, new RegExp(String.raw`\*\*${actual.tools} tools\*\*`), `README must say ${actual.tools} tools`);
  assert.match(
    README,
    new RegExp(String.raw`All ${actual.tools} tools \(normal mode\)`),
    "tool list header must match",
  );
});

test("README advertises the real resource count", () => {
  assert.match(README, new RegExp(String.raw`\*\*${actual.resources} resources\*\*`));
});

test("README advertises the real prompt count", () => {
  assert.match(README, new RegExp(String.raw`\*\*${actual.prompts} prompts\*\*`));
});

test("README advertises the real skill count", () => {
  assert.match(README, new RegExp(String.raw`\*\*${actual.skills} modular skills\*\*`));
});

test("architecture diagram uses the real counts", () => {
  assert.match(README, new RegExp(`│ *${actual.tools} tools`), "tool count inside the intro diagram");
  assert.match(README, new RegExp(`│ *${actual.resources} resources`), "resource count in the diagram");
});

console.log(
  `  ✅ README counts match reality (${actual.tools} tools / ${actual.resources} resources / ${actual.prompts} prompts / ${actual.skills} skills)`,
);
