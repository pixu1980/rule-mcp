/**
 * The install wizard rendered into a fake terminal, driven by keystrokes.
 *
 * This is the acceptance coverage the shell installer needed a macOS PTY and
 * `/usr/bin/script` for. Ink renders into any stream, so the same walk runs
 * on every platform in CI with no pseudo-terminal at all.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { KEY, settle } from "./_fake-terminal.fixture.mjs";
import { mountApp as mount } from "./_mount.fixture.mjs";
import { InstallApp } from "../_app-install.js";

test("the install wizard opens on preflight inside its frame", async () => {
  const { stdout, instance } = mount(InstallApp);

  await settle();

  const frame = stdout.lastFrame;

  assert.match(frame, /rule/, "the title bar must render");
  assert.match(frame, /Preflight/, "the step rail must render");
  assert.match(frame, /Node\.js/, "the Node check must render");
  assert.match(frame, /enter/, "the key bar must render");

  instance.unmount();
});

test("enter walks preflight to the agent picker", async () => {
  const { stdout, stdin, instance } = mount(InstallApp);

  await settle();
  stdin.press(KEY.enter);
  await settle();

  const frame = stdout.lastFrame;

  assert.match(frame, /Select agents/);
  assert.match(frame, /Coding agents/, "the catalog must be sectioned");
  assert.match(frame, /claude/);
  assert.match(frame, /more/, "a catalog taller than the frame must say so");

  instance.unmount();
});

test("the list scrolls far enough to reach the IDE section", async () => {
  const { stdout, stdin, instance } = mount(InstallApp);

  await settle();
  stdin.press(KEY.enter);
  await settle();

  for (let step = 0; step < 22; step++) {
    stdin.press(KEY.down);
  }

  await settle();

  assert.match(stdout.lastFrame, /IDEs/, "the second section must be reachable");
  assert.match(stdout.lastFrame, /emacs/, "the last row must be reachable");

  instance.unmount();
});

test("every catalog row renders without the frame clipping one away", async () => {
  const { stdout, stdin, instance } = mount(InstallApp, { dryRun: true }, { rows: 40 });

  await settle();
  stdin.press(KEY.enter);
  await settle();

  const frame = stdout.lastFrame;

  // Yoga silently drops rows when the body budget is overshot; codex sits
  // second in the catalog and was the first casualty when it was.
  for (const agent of ["claude", "codex", "cursor", "opencode", "droid", "kiro"]) {
    assert.match(frame, new RegExp(String.raw`\b${agent}\b`), `${agent} must render`);
  }

  instance.unmount();
});

test("the picker moves and toggles without leaving the frame", async () => {
  const { stdout, stdin, instance } = mount(InstallApp);

  await settle();
  stdin.press(KEY.enter);
  await settle();
  stdin.press(KEY.down);
  await settle();
  stdin.press(KEY.space);
  await settle();

  assert.match(stdout.lastFrame, /agents selected/, "the counter must survive a toggle");
  assert.match(stdout.lastFrame, /Select agents/, "the step must not advance on space");

  instance.unmount();
});

test("the mode step lists the transports and their limits", async () => {
  const { stdout, stdin, instance } = mount(InstallApp);

  await settle();
  stdin.press(KEY.enter);
  await settle();
  stdin.press(KEY.enter);
  await settle();

  const frame = stdout.lastFrame;

  assert.match(frame, /Install mode/);
  assert.match(frame, /stdio/);
  assert.match(frame, /daemon/);
  assert.match(frame, /docker/);

  instance.unmount();
});

test("escape walks back a step", async () => {
  const { stdout, stdin, instance } = mount(InstallApp);

  await settle();
  stdin.press(KEY.enter);
  await settle();
  stdin.press(KEY.enter);
  await settle();
  assert.match(stdout.lastFrame, /Install mode/);

  stdin.press(KEY.escape);
  await settle();
  assert.match(stdout.lastFrame, /Select agents/);

  instance.unmount();
});
