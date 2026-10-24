/**
 * The commands step: the rows it shows, and where answering it goes.
 *
 * The screens are the half of the selection that a flag cannot check. What
 * they resolve to is asserted in `_commands-selection.test.mjs`; this one
 * asserts that the wizard reaches them, skips them when they would decide
 * nothing, and opens each list where it was told to.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { areaItems, familyItems, presetItems, selectionLabel, skillItems } from "../_commands-items.js";
import { HINTS, STEP_NAMES } from "../_steps.data.js";
import { initialCursor } from "../_use-selection.js";
import { installViews } from "../_views-install.js";

test("the step offers the presets the flags accept, and says what each one costs", () => {
  const presets = presetItems();
  const ids = presets.map((item) => item.id);

  assert.deepEqual(ids.slice(0, 3), ["minimal", "standard", "full"]);
  assert.equal(ids.at(-1), "custom", "custom is the way out of the one-screen case");

  for (const item of presets.slice(0, 3)) {
    assert.match(item.label, /\(\d+\)/, `${item.id}: the count belongs in the label: ${item.label}`);
  }
});

test("the custom drill-down is families, then areas, then the skills of those areas", () => {
  assert.deepEqual(
    familyItems().map((item) => item.id),
    ["areas", "personas", "tasks"],
  );

  const areas = areaItems();

  assert.ok(areas.length > 5, `every area is offered: ${areas.length}`);

  const frontend = areas.find((item) => item.id === "frontend");

  assert.ok(frontend, "frontend is an area");

  const entries = (list) => list.filter((item) => !item.section);
  const skills = entries(skillItems(["frontend"]));

  assert.ok(
    skills.every((item) => item.id.startsWith("rule-mcp-frontend")),
    "narrowing to one area narrows the skills to that area",
  );
  assert.ok(skills.length > 0 && skills.length < entries(skillItems(areas.map((item) => item.id))).length);
});

test("a selection describes itself, because the review screen has to print it", () => {
  assert.match(selectionLabel({ preset: "standard" }), /standard/);
  assert.match(selectionLabel(null), /every/i);
  assert.match(selectionLabel({ families: ["areas"], areas: ["frontend"] }), /frontend/);
});

test("a radio list opens on the value it was given, not on row one", () => {
  const items = presetItems();
  const indexes = items.map((item, index) => index);

  assert.equal(items[initialCursor(items, indexes, ["standard"], "radio")].id, "standard");
  assert.equal(items[initialCursor(items, indexes, [], "radio")].id, "minimal", "no value means the first row");
  assert.equal(initialCursor(items, indexes, ["full"], "check"), 0, "a checklist opens at the top either way");
});

test("the commands screen is skipped when no command file is being written", () => {
  const moves = [];
  const state = {
    active: -1,
    agents: ["claude"],
    body: 10,
    catalog: { items: [], detected: ["claude"] },
    checks: [],
    columns: 100,
    context: {},
    dryRun: true,
    extras: ["rules"],
    extrasList: [],
    mode: "stdio",
    plan: [],
    results: [],
    selection: null,
    setAgents() {},
    setDryRun() {},
    setExtras() {},
    setMode() {},
    setSelection() {},
    setStep: (next) => moves.push(next),
    quit() {},
  };
  const views = installViews(state);

  assert.equal(views.length, STEP_NAMES.install.length, "one screen per rail entry");

  views[3]().props.onSubmit(["rules"]);
  views[3]().props.onSubmit(["rules", "commands"]);

  assert.deepEqual(moves, [5, 4], "without the commands step the rail goes straight to Review");

  moves.length = 0;
  views[4]().props.onSubmit({ preset: "minimal" });

  assert.deepEqual(moves, [5], "answering the commands screen moves on to Review");
});

test("the rail and the key hints stay the same length", () => {
  assert.equal(STEP_NAMES.install.length, HINTS.install.length);
  assert.equal(STEP_NAMES.uninstall.length, HINTS.uninstall.length);
  assert.ok(STEP_NAMES.install.includes("Commands"), STEP_NAMES.install.join(" > "));
});
