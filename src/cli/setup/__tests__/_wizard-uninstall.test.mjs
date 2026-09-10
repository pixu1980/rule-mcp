

/**
 * The uninstall wizard rendered into a fake terminal.
 *
 * The destructive step gets its own file and its own assertions: nothing may
 * be armed for deletion without the user ticking it.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { KEY, settle } from "./_fake-terminal.fixture.mjs";
import { mountApp as mount } from "./_mount.fixture.mjs";
import { UninstallApp } from "../_app-uninstall.js";

test("the uninstall wizard opens on the selection screen", async () => {
  const { stdout, instance } = mount(UninstallApp);

  await settle();

  const frame = stdout.lastFrame;

  assert.match(frame, /Uninstall/);
  assert.match(frame, /What to remove/);
  assert.match(frame, /Agent MCP configs/);

  instance.unmount();
});

test("purge is its own screen and starts empty", async () => {
  const { stdout, stdin, instance } = mount(UninstallApp);

  await settle();
  stdin.press(KEY.enter);
  await settle();

  const frame = stdout.lastFrame;

  assert.match(frame, /Purge state and config/);
  assert.match(frame, /kept unless you tick it/);
  assert.doesNotMatch(frame, /will be deleted permanently/, "nothing may be armed for deletion by default");

  instance.unmount();
});
