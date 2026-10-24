/**
 * Ticking and submitting: the half of the list bindings that decides an answer.
 *
 * A tick on a disabled row would be a promise the install does not keep, so
 * the hook refuses it however the cursor got there. A radio list answers with
 * the highlighted row instead of a tick, which is why the two modes submit
 * different shapes.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { KEY, settle } from "./_fake-terminal.fixture.mjs";
import { probe, state } from "./_use-selection.fixture.mjs";

test("space ticks and unticks the row under the cursor", async () => {
  const { stdout, stdin, instance } = await probe({});

  stdin.press(KEY.space);
  await settle();
  assert.equal(state(stdout).selected, "claude");

  stdin.press(KEY.space);
  await settle();
  assert.equal(state(stdout).selected, "", "ticking twice leaves nothing selected");

  instance.unmount();
});

test("a disabled row cannot be ticked, however the cursor got there", async () => {
  const { stdout, stdin, instance } = await probe({});

  stdin.press(KEY.down);
  await settle();
  stdin.press(KEY.space);
  await settle();

  assert.equal(state(stdout).selected, "", "a tick the plan would ignore is not offered");

  instance.unmount();
});

test("a ticks everything that can be ticked, and n clears it", async () => {
  const { stdout, stdin, instance } = await probe({});

  stdin.press("a");
  await settle();
  assert.equal(state(stdout).selected, "claude,zed", "the disabled row is left out of all");

  stdin.press("n");
  await settle();
  assert.equal(state(stdout).selected, "");

  instance.unmount();
});

test("enter submits the ticked ids in a check list", async () => {
  const submitted = [];
  const { stdin, instance } = await probe({ onSubmit: (value) => submitted.push(value) });

  stdin.press(KEY.space);
  await settle();
  stdin.press(KEY.enter);
  await settle();

  assert.deepEqual(submitted, [["claude"]]);

  instance.unmount();
});

test("escape goes back", async () => {
  let backs = 0;
  const { stdin, instance } = await probe({ onBack: () => (backs += 1) });

  stdin.press(KEY.escape);
  await settle();
  assert.equal(backs, 1);

  instance.unmount();
});

test("a radio list follows the cursor and submits one id", async () => {
  const submitted = [];
  const { stdout, stdin, instance } = await probe({ mode: "radio", initial: ["zed"], onSubmit: (value) => submitted.push(value) });

  assert.equal(state(stdout).selected, "zed", "it starts on the incoming answer");

  stdin.press(KEY.down);
  await settle();
  assert.equal(state(stdout).selected, "claude", "selection follows the cursor, with no separate tick");

  stdin.press("a");
  await settle();
  assert.equal(state(stdout).selected, "claude", "a and n are check-list keys and do nothing here");

  stdin.press(KEY.enter);
  await settle();
  assert.deepEqual(submitted, ["claude"], "a radio list submits the id, not a list");

  instance.unmount();
});

test("an initial id that cannot be ticked is dropped rather than carried", async () => {
  const { stdout, instance } = await probe({ initial: ["codex", "zed"] });

  assert.equal(state(stdout).selected, "zed", "the disabled row does not arrive pre-ticked");

  instance.unmount();
});
