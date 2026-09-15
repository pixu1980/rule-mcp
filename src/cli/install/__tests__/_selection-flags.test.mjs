

/**
 * The flags and the wizard have to describe one selection, not two.
 *
 * `selectionOf` reads the flags, `selectionArgs` writes them back, and the
 * pair is what keeps a flagged install and a wizard install reaching the same
 * `agent-commands` run. Null is the load-bearing value: it means "all of
 * them", so an arm that returns an empty object instead would write nothing.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { selectionArgs, selectionFrom, selectionOf } from "../_selection-flags.js";

test("no flag at all selects nothing in particular", () => {
  assert.equal(selectionOf(), null, "no options object is no selection");
  assert.equal(selectionOf({}), null, "an empty one is the same");
  assert.equal(selectionOf({ skills: [] }), null, "an empty array flag is not a selection");
});

test("a flag present but empty is still a selection, resolving to an empty list", () => {
  // `--areas ""` is a flag the user typed: it asks for a narrowed selection
  // that happens to name nothing, which is not the same as asking for all.
  const selection = selectionOf({ areas: "  " });

  assert.notEqual(selection, null, "the flag was given, so a selection was asked for");
  assert.deepEqual(selection.areas, [], "and it names nothing");
});

test("a comma-separated flag becomes a trimmed list", () => {
  assert.deepEqual(selectionOf({ areas: "frontend, backend ,, data" }), {
    preset: undefined,
    families: undefined,
    areas: ["frontend", "backend", "data"],
    skills: undefined,
  });
});

test("an array flag is taken as it is", () => {
  assert.deepEqual(selectionOf({ skills: ["rule-styleguide-css"] }).skills, ["rule-styleguide-css"]);
});

test("a preset alone is a selection", () => {
  assert.deepEqual(selectionOf({ preset: "minimal" }), { preset: "minimal", families: undefined, areas: undefined, skills: undefined });
});

test("the argv of no selection is no argv", () => {
  assert.deepEqual(selectionArgs(null), []);
  assert.deepEqual(selectionArgs(), []);
});

test("a preset wins the argv on its own", () => {
  assert.deepEqual(selectionArgs({ preset: "standard", areas: ["frontend"] }), ["--preset", "standard"], "the preset is the whole answer");
});

test("families, areas and skills each contribute their flag", () => {
  assert.deepEqual(selectionArgs({ families: ["areas", "tasks"], areas: ["frontend"], skills: ["rule-backend"] }), [
    "--families",
    "areas,tasks",
    "--areas",
    "frontend",
    "--skills",
    "rule-backend",
  ]);
});

test("an empty list contributes no flag", () => {
  assert.deepEqual(selectionArgs({ families: [], areas: [], skills: [] }), [], "empty is not a selection of nothing");
});

test("what selectionOf reads, selectionArgs writes back", () => {
  const options = { areas: "frontend,backend" };

  assert.deepEqual(selectionArgs(selectionOf(options)), ["--areas", "frontend,backend"]);
});

test("no flags resolve to no command list, which every caller reads as all of them", () => {
  assert.equal(selectionFrom({}), null);
});

test("a bad area name is reported and the good ones still resolve", () => {
  const warnings = [];
  const commands = selectionFrom({ areas: "frontend,not-an-area" }, (text) => warnings.push(text));

  assert.ok(Array.isArray(commands), "the run still gets a command list");
  assert.ok(
    warnings.some((text) => text.includes("not-an-area")),
    `the typo is named: ${warnings.join(" | ")}`,
  );
});

test("families default to the three a bare area selection implies", () => {
  const withAreas = selectionFrom({ areas: "frontend" }, () => {});
  const withPreset = selectionFrom({ preset: "minimal" }, () => {});

  assert.ok(Array.isArray(withAreas) && withAreas.length > 0, "an area selection resolves to commands");
  assert.ok(Array.isArray(withPreset), "a preset resolves without the default families");
});
