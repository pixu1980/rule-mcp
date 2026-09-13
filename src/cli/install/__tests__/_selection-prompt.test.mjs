/**
 * The picker: one screen for a preset, three only when asked for.
 *
 * The prompts are injected, so what is pinned here is the flow - which
 * question follows which answer - rather than anything a terminal does.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { promptSelection } from "../_selection-prompt.js";

/** A scripted pair of prompts that records what it was asked. */
function scripted(answers) {
  const asked = [];

  const next = (kind) => (options) => {
    asked.push({ kind, message: options.message, options: options.options.map((option) => option.value) });

    return Promise.resolve(answers.shift());
  };

  return { io: { select: next("select"), multiselect: next("multiselect") }, asked };
}

test("a preset answers in one question", async () => {
  const { io, asked } = scripted(["minimal"]);
  const { commands, preset } = await promptSelection(io);

  assert.equal(asked.length, 1, "nobody is made to answer three questions to take a preset");
  assert.equal(preset, "minimal");
  assert.ok(commands.includes("rule-area-frontend"), "and it resolves to the preset's commands");
  assert.ok(!commands.includes("rule-area-frontend-react"));
});

test("the preset question offers every preset plus custom, with its size", async () => {
  const { io, asked } = scripted(["standard"]);
  await promptSelection(io);

  assert.deepEqual(asked[0].options, ["minimal", "standard", "full", "custom"]);
  assert.match(asked[0].message, /installed/i);
});

test("custom walks families, then areas, then skills", async () => {
  const { io, asked } = scripted(["custom", ["areas"], ["frontend"], ["rule-frontend-react"]]);
  const { commands, preset } = await promptSelection(io);

  assert.equal(asked.length, 4, "one question per level, after the preset question");
  assert.equal(preset, null, "a custom selection is not a preset");
  assert.ok(commands.includes("rule-area-frontend-react"), "the chosen skill");
  assert.ok(commands.includes("rule-area-frontend"), "and the hub of its area");
  assert.ok(!commands.includes("rule-area-frontend-vue"), "but nothing unchosen");
});

test("custom stops early when no area family was chosen", async () => {
  const { io, asked } = scripted(["custom", ["tasks"]]);
  const { commands } = await promptSelection(io);

  assert.equal(asked.length, 2, "there is nothing to ask about areas when areas were not chosen");
  assert.ok(commands.includes("rule-handoff"), "the chosen family is written");
  assert.ok(commands.every((name) => !name.startsWith("rule-area-")), "and no area command is");
});

test("custom stops at areas when the chosen ones have no members", async () => {
  const { io, asked } = scripted(["custom", ["areas"], ["caveman"]]);
  const { commands } = await promptSelection(io);

  assert.equal(asked.length, 3, "an area with no skills has nothing to narrow");
  assert.ok(commands.includes("rule-area-caveman"), "its hub is still written");
});

test("choosing nothing at every level leaves the router", async () => {
  const { io } = scripted(["custom", [], []]);
  const { commands } = await promptSelection(io);

  assert.deepEqual(commands, ["rule"], "something has to answer, and it is the dispatcher");
});
