

/**
 * Moving the cursor: the half of the list bindings that changes no answer.
 *
 * Headings live in the same array as the rows, so moving is a search for the
 * next selectable index rather than an increment - and a disabled row is
 * still reachable, because its detail panel is what explains why it is
 * disabled.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { KEY, settle } from "./_fake-terminal.fixture.mjs";
import { probe, state } from "./_use-selection.fixture.mjs";

test("the cursor steps over headings, in both directions", async () => {
  const { stdout, stdin, instance } = await probe({});

  assert.equal(state(stdout).cursor, "1", "it starts below the first heading");

  stdin.press(KEY.down);
  await settle();
  assert.equal(state(stdout).cursor, "2", "a disabled row is still reachable, so its panel can explain itself");

  stdin.press(KEY.down);
  await settle();
  assert.equal(state(stdout).cursor, "4", "the second heading is stepped over");

  stdin.press(KEY.up);
  await settle();
  assert.equal(state(stdout).cursor, "2");

  instance.unmount();
});

test("the cursor wraps at both ends rather than stopping", async () => {
  const { stdout, stdin, instance } = await probe({});

  stdin.press(KEY.up);
  await settle();
  assert.equal(state(stdout).cursor, "4", "up from the first row lands on the last");

  stdin.press(KEY.down);
  await settle();
  assert.equal(state(stdout).cursor, "1", "and down from the last comes back to the first");

  instance.unmount();
});

test("j and k move as well, for whoever types them", async () => {
  const { stdout, stdin, instance } = await probe({});

  stdin.press("j");
  await settle();
  assert.equal(state(stdout).cursor, "2");

  stdin.press("k");
  await settle();
  assert.equal(state(stdout).cursor, "1");

  instance.unmount();
});

test("a number key jumps and ticks in one keystroke", async () => {
  const { stdout, stdin, instance } = await probe({});

  stdin.press("3");
  await settle();

  const after = state(stdout);

  assert.equal(after.cursor, "4", "the third selectable row");
  assert.equal(after.selected, "zed", "and it is ticked on the way");

  instance.unmount();
});

test("a number past the end of the list does nothing", async () => {
  const { stdout, stdin, instance } = await probe({});

  stdin.press("9");
  await settle();

  const after = state(stdout);

  assert.equal(after.cursor, "1", "the cursor stays where it was");
  assert.equal(after.selected, "");

  instance.unmount();
});
