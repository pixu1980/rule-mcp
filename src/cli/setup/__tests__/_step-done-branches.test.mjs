

/** Branch coverage for the done screen: failures, dry-run and quit. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { render } from "ink";

import { FakeStdin, FakeStdout, KEY, settle } from "./_fake-terminal.fixture.mjs";

process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { h } = await import("../_h.js");
const { StepDone } = await import("../_step-done.js");

function mount({ counts, results, dryRun }) {
  const stdout = new FakeStdout({ columns: 100, rows: 20 });
  const stdin = new FakeStdin();
  const quits = [];
  const instance = render(
    h(StepDone, {
      counts,
      results,
      dryRun,
      nextSteps: ["rule-mcp doctor"],
      onQuit: () => quits.push(true),
    }),
    { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false },
  );

  return { stdout, stdin, instance, quits };
}

test("a dry run with no problems says Complete-ish dry", async () => {
  const app = mount({
    counts: { ok: 2, warn: 0, fail: 0, skip: 0 },
    results: [
      { id: "a", title: "A", status: "ok", summary: "done" },
      { id: "b", title: "B", status: "ok", summary: "done" },
    ],
    dryRun: true,
  });

  await settle();
  assert.match(app.stdout.lastFrame, /Dry run complete/u);
  assert.match(app.stdout.lastFrame, /rule-mcp doctor/u);

  app.stdin.press("q");
  await settle();
  assert.equal(app.quits.length, 1);
  app.instance.unmount();
});

test("failures and warnings are listed by name", async () => {
  const app = mount({
    counts: { ok: 1, warn: 1, fail: 1, skip: 0 },
    results: [
      { id: "a", title: "A", status: "ok", summary: "ok" },
      { id: "b", title: "Broken", status: "fail", summary: "boom" },
      { id: "c", title: "Soft", status: "warn", summary: "careful" },
    ],
    dryRun: false,
  });

  await settle();
  assert.match(app.stdout.lastFrame, /Finished with failures/u);
  assert.match(app.stdout.lastFrame, /Broken/u);
  assert.match(app.stdout.lastFrame, /Soft/u);

  app.stdin.press(KEY.enter);
  await settle();
  assert.equal(app.quits.length, 1);
  app.instance.unmount();
});
