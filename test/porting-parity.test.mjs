/**
 * Pins the approved additive port contract without reading the external source
 * repository. The fixture was captured from rule-mcp develop@12d60a9 and
 * rule-mcp main@bd413da. It stays RED until the complete union lands.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadAllSkills } from "../src/core/skills.js";
import { listPrompts } from "../src/prompts/index.js";
import { listResources } from "../src/resources/index.js";
import { listTools } from "../src/tools/router.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseline = JSON.parse(readFileSync(new URL("fixtures/rule-porting-baseline.json", import.meta.url), "utf8"));
const sorted = (values) => [...values].sort((left, right) => left.localeCompare(right));
const namesOf = (values, key) => sorted(values.map((value) => value[key]));
const missingPaths = (paths) => paths.filter((path) => !existsSync(join(root, path)));

await loadAllSkills(true);

const actual = {
  prompts: namesOf(listPrompts(), "name"),
  resources: namesOf(listResources(), "uri"),
  skills: sorted(
    readdirSync(join(root, "skills"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
      .map((entry) => entry.name),
  ),
  tools: namesOf(listTools(), "name"),
};

test("baseline pins the approved immutable source revision", function () {
  assert.equal(baseline.policy.sourceBranch, "develop");
  assert.equal(baseline.policy.sourceCommit, "12d60a9e0eb312010314e5b800e31cf71663d926");
  assert.equal(baseline.policy.sourceUntouched, true);
  assert.equal(baseline.policy.namespace, "rule-native");
  assert.equal(baseline.policy.commonSkillConflict, "source-wins");
  assert.equal(baseline.policy.targetOnly, "preserve-active");
  assert.equal(baseline.policy.version, "1.0.0");
});

test("skills match the complete additive public union", () =>
  assert.deepEqual(actual.skills, baseline.expectedUnion.skills));

test("tools match the complete additive public union", () =>
  assert.deepEqual(actual.tools, baseline.expectedUnion.tools));

test("resources match the complete additive public union", () =>
  assert.deepEqual(actual.resources, baseline.expectedUnion.resources));

test("prompts match the complete additive public union", () =>
  assert.deepEqual(actual.prompts, baseline.expectedUnion.prompts));

test("every source-only runtime, script, and test path has been ported", function () {
  const required = [...baseline.sourceOnly.runtimeFiles, ...baseline.sourceOnly.scripts, ...baseline.sourceOnly.tests];
  assert.deepEqual(missingPaths(required), [], "source-only paths still missing from the target");
});

test("every target-only runtime, test, skill, and integration root remains present", function () {
  const required = [
    ...baseline.targetOnly.runtimeFiles,
    ...baseline.targetOnly.tests,
    ...baseline.targetOnly.skills.map((skill) => join("skills", skill, "SKILL.md")),
    ...baseline.targetOnly.preservedRoots,
  ];
  assert.deepEqual(missingPaths(required), [], "the port must not delete target-only capabilities");
});

test("the public MCP surface contains no legacy rule namespace", function () {
  const leaked = [...actual.tools, ...actual.resources, ...actual.prompts, ...actual.skills].filter((name) =>
    name.toLowerCase().includes("rule"),
  );
  assert.deepEqual(leaked, []);
});
