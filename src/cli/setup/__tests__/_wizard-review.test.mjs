

/**
 * The review gate and the run that follows it.
 *
 * Nothing in the wizard writes before this screen is confirmed, so these
 * tests are the ones that prove a dry run stays a dry run and that arming
 * it is a deliberate keystroke.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { KEY, settle } from "./_fake-terminal.fixture.mjs";
import { mountApp as mount } from "./_mount.fixture.mjs";
import { InstallApp } from "../_app-install.js";

/**
 * Walk from preflight to the review screen.
 *
 * Counted by the screen it is looking for, not by a number of steps: the step
 * list grows, and a hard-coded count silently stops one screen short and then
 * asserts against whatever happens to be on the terminal.
 */
async function toReview(handles) {
  await settle();

  for (let step = 0; step < 12 && !/\n {2}Review\n/.test(handles.stdout.lastFrame); step++) {
    handles.stdin.press(KEY.enter);
    await settle();
  }
}

test("review names the dry run before anything is written", async () => {
  const handles = mount(InstallApp);
  const { stdout, stdin, instance } = handles;

  await toReview(handles);

  const frame = stdout.lastFrame;

  assert.match(frame, /Review/);
  assert.match(frame, /Dry run - nothing will be written/);
  assert.match(frame, /Runtime home/, "the plan itself must be listed");

  instance.unmount();
});

test("d arms the run and says what it will change", async () => {
  const handles = mount(InstallApp);
  const { stdout, stdin, instance } = handles;

  await toReview(handles);

  stdin.press(KEY.dryRun);
  await settle();

  assert.match(stdout.lastFrame, /Live run/);

  instance.unmount();
});

test("a dry run walks through the apply screen to the summary", async () => {
  const handles = mount(InstallApp, { dryRun: true, extras: ["rules"] });

  await toReview(handles);
  handles.stdin.press(KEY.enter);
  await settle(1200);

  const frame = handles.stdout.lastFrame;

  assert.match(frame, /Dry run complete|Complete/, "the run must reach the summary");
  assert.match(frame, /ok/, "the tally must render");
  assert.match(frame, /Next/, "the closing guidance must render");

  handles.instance.unmount();
});

test("the apply screen reports every task in the plan", async () => {
  const handles = mount(InstallApp, { dryRun: true, extras: ["rules"] });

  await toReview(handles);
  handles.stdin.press(KEY.enter);
  await settle(1200);

  assert.match(handles.stdout.output, /Runtime home/, "the first task must have been shown");
  assert.match(handles.stdout.output, /Instruction file/, "an optional task must have been shown");

  handles.instance.unmount();
});
