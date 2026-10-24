/**
 * ARCH-1: the reload port is a seam, not a dependency.
 *
 * The port imports nothing, so self-update can ask for a reload without
 * reaching the loader. These tests pin both halves: an unregistered port is a
 * quiet no-op, and a registered one is what actually runs.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { isReloading, registerReloadPort, reloadSkills } from "../_reload-port.js";

test("an unregistered port reloads nothing and says so", async () => {
  assert.equal(isReloading(), false, "nothing is reloading before a catalog is wired in");
  await assert.doesNotReject(reloadSkills(), "and asking anyway is not an error");
});

test("a registered port is the one that runs", async () => {
  let calls = 0;
  let inFlight = false;

  registerReloadPort({
    reloadSkills: async () => {
      calls += 1;
      inFlight = false;
    },
    isReloading: () => inFlight,
  });

  inFlight = true;

  assert.equal(isReloading(), true, "the port reports the implementation's state");
  await reloadSkills();
  assert.equal(calls, 1, "and the implementation is what reloads");
  assert.equal(isReloading(), false, "the state is read live, not cached");
});
