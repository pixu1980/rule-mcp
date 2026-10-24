

/**
 * Branch coverage for the surface step's two drill-down stages.
 *
 * The preset screen is one keystroke; Custom is three screens, and this walk
 * exercises the transition into each of them, including a preset answer that
 * opens the radio on the row it names.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { render } from "ink";

import { FakeStdin, FakeStdout, KEY, settle } from "./_fake-terminal.fixture.mjs";

process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { loadAllSkills } = await import("../../../core/skills/index.js");
await loadAllSkills();

const { h } = await import("../_h.js");
const { StepSurface } = await import("../_step-surface.js");

/** Mount the step against a fake terminal with its answers recorded. */
function mountSurface(initial) {
  const stdout = new FakeStdout({ columns: 120, rows: 40 });
  const stdin = new FakeStdin();
  const answers = [];
  const backs = [];
  const instance = render(h(StepSurface, { initial, columns: 120, height: 40, onSubmit: (answer) => answers.push(answer), onBack: () => backs.push(true) }), {
    stdout,
    stdin,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  return { stdout, stdin, instance, answers, backs };
}

test("the preset screen answers in one keystroke", async () => {
  const app = mountSurface(null);

  await settle();
  assert.match(app.stdout.lastFrame, /Which server tools\?/);
  assert.match(app.stdout.lastFrame, /Full \(/, "the opening row is the full surface");

  app.stdin.press(KEY.enter);
  await settle();

  assert.deepEqual(app.answers, [{ preset: "full" }], "the highlighted preset is the answer");
  assert.deepEqual(app.backs, [], "answering does not walk back");

  app.instance.unmount();
});

test("a plan that already holds areas opens the areas screen on them, and none ticked answers at once", async () => {
  const app = mountSurface({ areas: ["frontend"] });

  await settle();
  // The preset radio opens on Full; three presses down reach Custom.
  for (let step = 0; step < 3; step++) {
    app.stdin.press(KEY.down);
    await settle();
  }
  app.stdin.press(KEY.enter);
  await settle();

  assert.match(app.stdout.lastFrame, /Which areas serve tools\?/);

  app.stdin.press("n");
  await settle();
  app.stdin.press(KEY.enter);
  await settle();

  assert.deepEqual(app.answers, [{ areas: [] }], "an empty area list is an answer, not a reason to show an empty skills screen");

  app.instance.unmount();
});

test("a subset of skills is answered as skills, not as every area", async () => {
  const app = mountSurface(null);

  await settle();
  for (let step = 0; step < 3; step++) {
    app.stdin.press(KEY.down);
    await settle();
  }
  app.stdin.press(KEY.enter);
  await settle();
  app.stdin.press(KEY.enter);
  await settle();
  assert.match(app.stdout.lastFrame, /Which skills\?/);

  app.stdin.press("n");
  await settle();
  app.stdin.press(KEY.enter);
  await settle();

  assert.deepEqual(app.answers, [{ skills: [] }], "an unticked skills screen names the skills it keeps");

  app.instance.unmount();
});

test("a preset from the plan opens the radio on that row, and Custom walks areas then skills", async () => {
  const app = mountSurface({ preset: "standard" });

  await settle();

  // Standard is the second row; two presses down reach Custom.
  app.stdin.press(KEY.down);
  await settle();
  app.stdin.press(KEY.down);
  await settle();
  app.stdin.press(KEY.enter);
  await settle();

  assert.match(app.stdout.lastFrame, /Which areas serve tools\?/);
  assert.deepEqual(app.answers, [], "Custom is a drill-down, not an answer");

  app.stdin.press(KEY.enter);
  await settle();

  assert.match(app.stdout.lastFrame, /Which skills\?/);
  assert.deepEqual(app.answers, [], "the areas screen still has the skills screen to come");

  app.stdin.press(KEY.enter);
  await settle();

  assert.equal(app.answers.length, 1, "the skills screen submits the answer");
  assert.ok(app.answers[0].areas.length > 0, "every area is kept when all of them were ticked");

  app.instance.unmount();
});
