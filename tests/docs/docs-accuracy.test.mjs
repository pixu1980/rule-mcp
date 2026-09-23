/**
 * docs-accuracy.test.mjs
 *
 * The README advertises surface counts. This test computes the real surface at
 * runtime and fails whenever README.md disagrees.
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
  const { bootstrapCoreTools } = await import("../../src/tools/_bootstrap.js");
  await bootstrapCoreTools();
  const { listTools } = await import("../../src/tools/router/index.js");
  const { listResources } = await import("../../src/resources/index.js");
  const { listPrompts } = await import("../../src/prompts/index.js");
  const { commandNames } = await import("../../src/core/agents/commands/index.js");
  const len = (r) => (Array.isArray(r) ? r.length : (r.tools ?? r.resources ?? r.prompts).length);
  actual.tools = len(await listTools({}));
  actual.resources = len(await listResources({}));
  actual.prompts = len(await listPrompts());
  actual.commands = commandNames().length;
  actual.skillDirs = readdirSync(new URL("../../skills", import.meta.url).pathname, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && existsSync(join(skillsRoot, entry.name, "SKILL.md")),
  ).length;
  actual.catalog = readdirSync(new URL("../../skills", import.meta.url).pathname, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && entry.name.startsWith("rule-") && existsSync(join(skillsRoot, entry.name, "SKILL.md")),
  ).length;
}

const README = readFileSync(fileURLToPath(new URL("../../README.md", import.meta.url)), "utf8");

test("README advertises the real tool count", () => {
  assert.match(README, new RegExp(`${actual.tools} tools`), `README must mention ${actual.tools} tools`);
});

test("README advertises the real resource count", () => {
  assert.match(README, new RegExp(`${actual.resources} resources`));
});

test("README advertises the real prompt count", () => {
  assert.match(README, new RegExp(`${actual.prompts} prompts`));
});

test("README advertises the catalog skill count", () => {
  assert.match(README, new RegExp(`${actual.catalog} skills`));
});

test("README advertises the slash command count", () => {
  assert.match(README, new RegExp(`${actual.commands} slash commands`));
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

console.log(
  `  ✅ README counts match reality (${actual.tools} tools / ${actual.resources} resources / ${actual.prompts} prompts / ${actual.catalog} skills / ${actual.commands} commands)`,
);
