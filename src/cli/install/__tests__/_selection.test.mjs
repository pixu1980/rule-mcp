

/**
 * What an install writes, chosen rather than assumed.
 *
 * Every skill owns a command now, so a full install is 152 files per agent
 * directory. Most people want a fraction of that, and the ones who want all of
 * it should say so. The selection is data - families, areas, skills - so the
 * interactive picker and the flags decide the same thing the same way.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { FAMILIES, PRESETS, resolveSelection } from "../_selection.js";

test("the families partition the command surface, with nothing left over", () => {
  const all = resolveSelection({ families: FAMILIES.map((family) => family.id) }).commands;
  const everything = resolveSelection({ preset: "full" }).commands;

  assert.deepEqual(new Set(all), new Set(everything), "selecting every family is the same as asking for everything");
  assert.ok(all.length > 140, `the full surface is what it is: ${all.length}`);
});

test("each preset is a subset of the next", () => {
  const minimal = new Set(resolveSelection({ preset: "minimal" }).commands);
  const standard = new Set(resolveSelection({ preset: "standard" }).commands);
  const full = new Set(resolveSelection({ preset: "full" }).commands);

  for (const name of minimal) {
    assert.ok(standard.has(name), `${name}: minimal must fit inside standard`);
  }

  for (const name of standard) {
    assert.ok(full.has(name), `${name}: standard must fit inside full`);
  }

  assert.ok(minimal.size < standard.size && standard.size < full.size, `the presets differ: ${minimal.size} < ${standard.size} < ${full.size}`);
});

test("the router is in every preset, because nothing works without it", () => {
  for (const preset of Object.keys(PRESETS)) {
    assert.ok(resolveSelection({ preset }).commands.includes("rule"), `${preset}: the dispatcher is not optional`);
  }
});

test("minimal is the router and the area hubs, without the per-skill commands", () => {
  const { commands } = resolveSelection({ preset: "minimal" });

  assert.ok(commands.includes("rule-area-frontend"), "the hub is there");
  assert.ok(!commands.includes("rule-area-frontend-react"), "the member is not");
  assert.ok(
    commands.every((name) => !name.startsWith("rule-persona-")),
    "and neither are the personas",
  );
});

test("picking areas narrows the skill commands to those areas", () => {
  const { commands } = resolveSelection({ families: ["areas"], areas: ["frontend", "data"] });

  assert.ok(commands.includes("rule-area-frontend"), "a chosen area keeps its hub");
  assert.ok(commands.includes("rule-area-frontend-react"), "and its members");
  assert.ok(
    commands.every((name) => !name.startsWith("rule-area-backend")),
    "an area nobody chose is absent",
  );
});

test("picking skills narrows further, inside the areas chosen", () => {
  const { commands } = resolveSelection({ families: ["areas"], areas: ["frontend"], skills: ["rule-frontend-react"] });

  assert.ok(commands.includes("rule-area-frontend-react"), "the chosen skill is there");
  assert.ok(!commands.includes("rule-area-frontend-vue"), "one it did not choose is not");
  assert.ok(commands.includes("rule-area-frontend"), "the hub of a chosen area stays, so the area is still reachable");
});

test("personas and tasks are their own families", () => {
  const personas = resolveSelection({ families: ["personas"] }).commands;
  assert.ok(
    personas.some((name) => name.endsWith("-audit") && name.startsWith("rule-persona-")),
    "the audit personas",
  );
  assert.ok(
    personas.some((name) => name.endsWith("-plan") && name.startsWith("rule-persona-")),
    "the plan personas",
  );
  assert.ok(
    personas.every((name) => !name.startsWith("rule-area-")),
    "and nothing from another family",
  );

  const tasks = resolveSelection({ families: ["tasks"] }).commands;
  assert.ok(tasks.includes("rule-handoff") && tasks.includes("rule-check"), "the one-shot tasks");
});

test("an empty selection is the router alone, not a crash", () => {
  const { commands } = resolveSelection({});

  assert.deepEqual(commands, ["rule"], "something has to answer, and it is the dispatcher");
});

test("an unknown family, area or skill is reported rather than silently dropped", () => {
  const result = resolveSelection({ families: ["areas", "nope"], areas: ["frontend", "nowhere"], skills: ["rule-not-a-skill"] });

  assert.ok(
    result.problems.some((problem) => /nope/.test(problem)),
    `the family is named: ${JSON.stringify(result.problems)}`,
  );
  assert.ok(
    result.problems.some((problem) => /nowhere/.test(problem)),
    "so is the area",
  );
  assert.ok(
    result.problems.some((problem) => /rule-not-a-skill/.test(problem)),
    "and the skill",
  );
  assert.ok(result.commands.includes("rule-area-frontend"), "and what was valid still resolves");
});

test("the selection is sorted and free of duplicates", () => {
  const { commands } = resolveSelection({ preset: "full" });

  assert.deepEqual(commands, [...new Set(commands)], "a command is written once");
  assert.deepEqual(
    [...commands].sort((a, b) => a.localeCompare(b)),
    commands,
    "and in the order every other surface uses",
  );
});
