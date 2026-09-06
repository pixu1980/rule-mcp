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
const DOCS_INDEX = readFileSync(fileURLToPath(new URL("../../docs/README.md", import.meta.url)), "utf8");
const DOC_DIR = fileURLToPath(new URL("../../docs", import.meta.url));

const DOC_NUMBERS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

test("the docs suite 01-06 plus the unnumbered docs is complete and indexed", () => {
  for (const name of DOC_NUMBERS) {
    const doc = readdirSync(DOC_DIR).find((entry) => /^\d\d-/.test(entry) && entry.startsWith(name + "-"));
    assert.ok(doc, "a docs/" + name + "-*.md file exists");
    assert.ok(DOCS_INDEX.includes(doc), "docs/README indexes " + doc);
    const text = readFileSync(join(DOC_DIR, doc), "utf8");
    assert.ok(text.length > 200, doc + " is not an empty stub");
  }
});

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
