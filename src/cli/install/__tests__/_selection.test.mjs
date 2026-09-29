

/**
 * What an install writes, chosen rather than assumed.
 *
 * Area slash commands are hubs only (ADR 117). Personas and tasks still fan
 * out. The selection is data - families, areas - so the interactive picker and
 * the flags decide the same thing the same way.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { FAMILIES, PRESETS, resolveSelection } from "../_selection.js";

test("the families partition the command surface, with nothing left over", () => {
  const all = resolveSelection({ families: FAMILIES.map((family) => family.id) }).commands;
  const everything = resolveSelection({ preset: "full" }).commands;

  assert.deepEqual(new Set(all), new Set(everything), "selecting every family is the same as asking for everything");
  assert.ok(all.length > 30, `hubs + personas + tasks: ${all.length}`);
  assert.ok(!all.some((name) => /^rule-area-[a-z]+-/.test(name)), "no leaf area slash");
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

  // ADR 117: full and standard share the same area hubs; full equals standard
  // when both include personas+tasks. minimal stays smaller.
  assert.ok(minimal.size < standard.size, `minimal < standard: ${minimal.size} < ${standard.size}`);
  assert.deepEqual(standard, full, "standard and full match once leaf area slash is gone");
});

test("the router is in every preset, because nothing works without it", () => {
  for (const preset of Object.keys(PRESETS)) {
    assert.ok(resolveSelection({ preset }).commands.includes("rule"), `${preset}: the dispatcher is not optional`);
  }
});

test("minimal is the router and the area hubs, without leaf area slash", () => {
  const { commands } = resolveSelection({ preset: "minimal" });

  assert.ok(commands.includes("rule-area-frontend"), "the hub is there");
  assert.ok(!commands.includes("rule-area-frontend-react"), "the member is not");
  assert.ok(
    commands.every((name) => !name.startsWith("rule-persona-")),
    "and neither are the personas",
  );
});

test("picking areas keeps only those hubs", () => {
  const { commands } = resolveSelection({ families: ["areas"], areas: ["frontend", "data"] });

  assert.ok(commands.includes("rule-area-frontend"), "a chosen area keeps its hub");
  assert.ok(commands.includes("rule-area-data"), "and data");
  assert.ok(!commands.includes("rule-area-frontend-react"), "no leaf slash");
  assert.ok(
    commands.every((name) => !name.startsWith("rule-area-backend")),
    "an area nobody chose is absent",
  );
});

test("picking skills still keeps the hub of that area (leaves are tools, not slash)", () => {
  const { commands } = resolveSelection({ families: ["areas"], areas: ["frontend"], skills: ["rule-frontend-react"] });

  assert.ok(commands.includes("rule-area-frontend"), "the hub stays reachable");
  assert.ok(!commands.includes("rule-area-frontend-react"), "no leaf slash to select");
});

test("personas and tasks are their own families", () => {
  const personas = resolveSelection({ families: ["personas"] }).commands;
  assert.ok(personas.includes("rule-persona-security") && personas.includes("rule-persona-a11y"), "one command per role");
  assert.ok(
    personas.every((name) => !/-(audit|review|plan)$/.test(name)),
    "the per-operation persona commands are gone (ADR 120)",
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
