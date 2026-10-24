

/**
 * The commands step's drill-down, driven by keystrokes.
 *
 * The one-screen preset path is covered by the flags that answer the same
 * question; what no flag can reach is the four-screen Custom path, where every
 * stage is state in this component rather than a rail entry. The step is
 * mounted on its own, against the fake terminal, so the walk is the component's
 * and not the whole wizard's.
 */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { render } from "ink";
import React from "react";

import { FakeStdin, FakeStdout } from "./_fake-terminal.fixture.mjs";
import { StepCommands } from "../_step-commands.js";

process.env.RULE_MCP_SKIP_GLOBAL_LINK = "1";
process.env.RULE_MCP_HOME = mkdtempSync(join(tmpdir(), "rule-step-commands-"));
process.env.RULE_MCP_STATE_DIR = join(process.env.RULE_MCP_HOME, "state");
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const ESC = "\u001B";
const ENTER = "\r";
const settle = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

/** Mount the step with no prior answer, and record what it decides. */
function mount({ initial = null } = {}) {
  const stdout = new FakeStdout({ columns: 100, rows: 30 });
  const stdin = new FakeStdin();
  const submitted = [];
  let backs = 0;
  const instance = render(
    React.createElement(StepCommands, {
      initial,
      columns: 100,
      height: 20,
      onSubmit: (selection) => submitted.push(selection),
      onBack: () => {
        backs += 1;
      },
    }),
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );

  return {
    stdout,
    stdin,
    instance,
    submitted,
    backs: () => backs,
  };
}

test("custom walks families, then areas, then skills, and submits all three", async () => {
  const { stdin, stdout, instance, submitted } = mount();

  await settle();
  assert.match(stdout.lastFrame, /Which commands\?/u, "an unanswered step opens on the preset");

  stdin.press("4");
  await settle();
  stdin.press(ENTER);
  await settle();
  assert.match(stdout.lastFrame, /Which families\?/u, "custom is the way into the drill-down");

  stdin.press(ENTER);
  await settle();
  assert.match(stdout.lastFrame, /Which areas\?/u, "the areas screen follows the families one");

  stdin.press(ENTER);
  await settle();
  assert.match(stdout.lastFrame, /Which skills\?/u, "the skills screen follows the areas one");

  // Back one stage and forward again: the skills list reopens on its answers.
  stdin.press(ESC);
  await settle();
  assert.match(stdout.lastFrame, /Which areas\?/u, "escape goes back a stage");
  stdin.press(ENTER);
  await settle();
  stdin.press(ENTER);
  await settle();

  assert.equal(submitted.length, 1, "the drill-down submits once, at the end");
  assert.ok(submitted[0].families.includes("areas"), "the families it was answered with are carried");
  assert.ok(submitted[0].areas.length > 0, "and the areas it was answered with");
  assert.ok(submitted[0].skills.length > 0, "and a skill list, so the answer is complete");

  instance.unmount();
});

test("a families answer without areas submits where it is", async () => {
  const { stdin, instance, submitted } = mount();

  await settle();
  stdin.press("4");
  await settle();
  stdin.press(ENTER);
  await settle();
  stdin.press("n");
  await settle();
  stdin.press("2");
  await settle();
  stdin.press(ENTER);
  await settle();

  assert.equal(submitted.length, 1, "the families screen can be the last one");
  assert.deepEqual(submitted[0], { families: ["personas"] }, "and it answers exactly what was ticked");

  instance.unmount();
});

test("an empty areas answer submits rather than opening a screen with no rows", async () => {
  const { stdin, stdout, instance, submitted } = mount();

  await settle();
  stdin.press("4");
  await settle();
  stdin.press(ENTER);
  await settle();
  stdin.press(ENTER);
  await settle();

  // Back to the families screen and forward again, so the areas answer survives.
  stdin.press(ESC);
  await settle();
  assert.match(stdout.lastFrame, /Which families\?/u, "escape from areas returns to the families screen");
  stdin.press(ENTER);
  await settle();

  stdin.press("n");
  await settle();
  stdin.press(ENTER);
  await settle();

  assert.equal(submitted.length, 1, "an areas screen with nothing ticked still answers");
  assert.deepEqual(submitted[0].areas, [], "the empty answer is reported as empty");
  assert.deepEqual(submitted[0].families, ["areas", "tasks"], "with the families it came from");

  instance.unmount();
});

test("an answered step opens on the answers it was given", async () => {
  const preset = mount({ initial: { preset: "minimal" } });

  await settle();
  preset.stdin.press(ENTER);
  await settle();

  assert.deepEqual(preset.submitted, [{ preset: "minimal" }], "the radio opens on the given preset, not on row one");
  preset.instance.unmount();

  const custom = mount({ initial: { families: ["personas"] } });

  await settle();
  custom.stdin.press("4");
  await settle();
  custom.stdin.press(ENTER);
  await settle();
  custom.stdin.press(ENTER);
  await settle();

  assert.deepEqual(custom.submitted, [{ families: ["personas"] }], "the families answer survives into the drill-down");
  custom.instance.unmount();
});

test("a preset answers in one keystroke, and escape leaves the drill-down", async () => {
  const preset = mount();

  await settle();
  preset.stdin.press(ENTER);
  await settle();

  assert.deepEqual(preset.submitted, [{ preset: "standard" }], "the highlighted preset is the answer, without a second screen");
  preset.instance.unmount();

  const drill = mount();

  await settle();
  drill.stdin.press("4");
  await settle();
  drill.stdin.press(ENTER);
  await settle();
  drill.stdin.press(ESC);
  await settle();
  assert.match(drill.stdout.lastFrame, /Which commands\?/u, "escape from families goes back to the presets");
  drill.stdin.press(ESC);
  await settle();

  assert.equal(drill.backs(), 1, "escape at the first stage leaves the step");
  assert.deepEqual(drill.submitted, [], "leaving submits nothing");

  drill.instance.unmount();
});
