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
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const skillsRoot = fileURLToPath(new URL("../../skills", import.meta.url));
const actual = {};
{
  const { loadAllSkills } = await import("../../src/core/skills/index.js");
  await loadAllSkills(true);
  const { listTools } = await import("../../src/tools/router/index.js");
  const { listResources } = await import("../../src/resources/index.js");
  const { listPrompts } = await import("../../src/prompts/index.js");
  const len = (r) => (Array.isArray(r) ? r.length : (r.tools ?? r.resources ?? r.prompts).length);
  actual.tools = len(await listTools({}));
  actual.resources = len(await listResources({}));
  actual.prompts = len(await listPrompts());
  actual.skills = readdirSync(new URL("../../skills", import.meta.url).pathname, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && existsSync(join(skillsRoot, entry.name, "SKILL.md")),
  ).length;
}

const README = readFileSync(fileURLToPath(new URL("../../README.md", import.meta.url)), "utf8");

// The handbook itself - that every chapter exists, is indexed and is not a
// stub - is checked by tests/docs/docs-handbook-numbering.test.mjs, which
// derives the sequence from the directory. A list of numbers written here
// would be the copy that forgets the chapter added next.

test("README advertises the real tool count", () => {
  assert.match(README, new RegExp(String.raw`\*\*${actual.tools} tools\*\*`), `README must say ${actual.tools} tools`);
  assert.match(README, new RegExp(String.raw`All ${actual.tools} tools \(normal mode\)`), "tool list header must match");
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

test("generated-document headers name scripts that exist", () => {
  const header = readFileSync(fileURLToPath(new URL("../../CHANGELOG.md", import.meta.url)), "utf8")
    .split("\n")
    .slice(0, 8)
    .join("\n");
  const missing = [...header.matchAll(/`((?:scripts|src|tests|docs|bin)\/[^`]*?)`/gu)]
    .map((match) => match[1])
    .filter((file, index, all) => all.indexOf(file) === index)
    .filter((file) => !existsSync(join(skillsRoot, "..", file)));

  assert.deepEqual(missing, [], "a header that names a missing script sends the next editor off disk");
});

console.log(`  ✅ README counts match reality (${actual.tools} tools / ${actual.resources} resources / ${actual.prompts} prompts / ${actual.skills} skills)`);
