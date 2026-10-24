/** Branch coverage for the review screen: danger, dry-run toggle and overflow. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { render } from "ink";

import { FakeStdin, FakeStdout, KEY, settle } from "./_fake-terminal.fixture.mjs";

process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { h } = await import("../_h.js");
const { StepReview } = await import("../_step-review.js");

function mount(props) {
  const stdout = new FakeStdout({ columns: 100, rows: 20 });
  const stdin = new FakeStdin();
  const toggles = [];
  const submits = [];
  const backs = [];
  const instance = render(
    h(StepReview, {
      plan: props.plan,
      dryRun: props.dryRun,
      title: props.title,
      danger: props.danger,
      height: props.height,
      onToggleDryRun: () => toggles.push(true),
      onSubmit: () => submits.push(true),
      onBack: () => backs.push(true),
    }),
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );

  return { stdout, stdin, instance, toggles, submits, backs };
}

test("a dry-run review shows the arming hint and toggles with d", async () => {
  const plan = [
    { id: "a", title: "One", detail: "first" },
    { id: "b", title: "Two", detail: "second" },
  ];
  const app = mount({ plan, dryRun: true, height: 10 });

  await settle();
  assert.match(app.stdout.lastFrame, /Dry run/u);

  app.stdin.press("d");
  await settle();
  assert.equal(app.toggles.length, 1);

  app.stdin.press(KEY.enter);
  await settle();
  assert.equal(app.submits.length, 1);

  app.instance.unmount();
});

test("a live danger review warns and hides overflow rows", async () => {
  const plan = Array.from({ length: 5 }, (_, index) => ({ id: `t${index}`, title: `Step ${index}`, detail: `d${index}` }));
  const app = mount({ plan, dryRun: false, danger: true, title: "Uninstall", height: 2 });

  await settle();
  assert.match(app.stdout.lastFrame, /Uninstall/u);
  assert.match(app.stdout.lastFrame, /Live run/u);
  assert.match(app.stdout.lastFrame, /3 more/u);

  app.stdin.press(KEY.escape);
  await settle();
  assert.equal(app.backs.length, 1);

  app.instance.unmount();
});
