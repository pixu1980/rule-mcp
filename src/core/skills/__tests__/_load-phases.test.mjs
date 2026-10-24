

/**
 * ARCH-2: loadAllSkills is three named phases, not one function.
 *
 * The loader knew every tool family and ran them in one body, so a change to
 * any family was made inside it and nothing about it could be tested without
 * loading the whole surface. These tests pin the split: what each phase owns,
 * that the orchestrator runs them, and that a reload stays idempotent.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { toolNameForSkill } from "../../../tools/skill/index.js";

const { exposesTool, getSkillNames, listTools } = await import("../../../tools/router/index.js");
const { REGISTERED_BY_CODE } = await import("../_skill-tools.js");
const { skillCache } = await import("../_lru.js");
const { loadAllSkills, registerCoreTools, registerSkillTools, resetForReload } = await import("../_load.js");

/** The live tool names. */
const names = () => listTools().map((tool) => tool.name);

/** The tool names the per-skill pass mints: every exposing skill the code does not register itself. */
const perSkillToolNames = () =>
  getSkillNames()
    .filter((name) => exposesTool(name) && !REGISTERED_BY_CODE.has(name))
    .map((name) => toolNameForSkill(name));

test("resetForReload empties the registry and the skill cache", async () => {
  await loadAllSkills();
  skillCache.set("rule-mcp-probe", { name: "rule-mcp-probe" });

  assert.ok(names().length > 0, "a loaded catalog registers tools");
  assert.equal(skillCache.size, 1, "and the seeded body is cached");

  resetForReload();

  assert.deepEqual(names(), [], "the registry is empty");
  assert.equal(skillCache.size, 0, "and so is the skill cache");
});

test("registerCoreTools registers the families that are not per-skill", async () => {
  resetForReload();
  await registerCoreTools();

  const core = names();

  assert.ok(core.length > 0, "the core families register");
  assert.ok(core.includes("rule_tool"), "the router skill's own tool is one of them");
  assert.ok(core.includes("rule_tool_meta"), "and the meta family");
  assert.ok(core.includes("rule_tool_update"), "and the update family");

  const perSkill = perSkillToolNames();

  assert.ok(perSkill.length > 0, "the bundled skills do mint tools");
  assert.deepEqual(
    core.filter((name) => perSkill.includes(name)),
    [],
    "but none of them is registered by this phase",
  );
});

test("registerSkillTools registers one tool per exposing skill", async () => {
  resetForReload();
  const before = names().length;

  registerSkillTools();

  assert.equal(names().length - before, perSkillToolNames().length, "each exposing skill mints exactly one tool");
});

test("loadAllSkills runs the phases in order and stays idempotent", async () => {
  resetForReload();
  await loadAllSkills();

  const once = names();

  assert.ok(once.length > 0, "a load registers a surface");
  assert.ok(once.includes("rule_tool_search"), "including the tools that serve skills rather than a skill");
  assert.ok(
    once.some((name) => perSkillToolNames().includes(name)),
    "and the tools the per-skill phase mints",
  );

  await loadAllSkills();
  assert.equal(names().length, once.length, "a second load is a no-op");

  await loadAllSkills(true);
  assert.equal(names().length, once.length, "and a forced reload does not duplicate the surface");
});
