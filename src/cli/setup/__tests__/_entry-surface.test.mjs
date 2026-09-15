

/**
 * The `setup` entry carries the surface answers like every other flag.
 *
 * `install.sh` forwards to `setup`, not to `install`, so a flag the setup
 * command cannot spell is a flag the documented installer rejects. What is
 * not picked here never reaches the wizard defaults or the plain runner.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { resolveSetupOptions } from "../_options.js";
import { setupOptions } from "../_entry.js";

/** A flag reader over a fake argv, the shape `_entry.js` expects. */
const io = (argv) => ({
  getArgument: (name) => {
    const index = argv.indexOf(name);

    return index === -1 ? undefined : argv[index + 1];
  },
  hasFlag: (name) => argv.includes(name),
});

test("the minimal pair arrives as a tri-state", () => {
  assert.equal(setupOptions("install", io(["--minimal"])).minimal, true);
  assert.equal(setupOptions("install", io(["--no-minimal"])).minimal, false);
  assert.equal(setupOptions("install", io([])).minimal, undefined, "unanswered leaves the saved config alone");
});

test("the surface spec normalizes through the same path the wizard uses", () => {
  const parsed = setupOptions("install", io(["--surface", "areas:frontend"]));

  assert.deepEqual(resolveSetupOptions(parsed).surface, { areas: ["frontend"] });
  assert.equal(resolveSetupOptions(setupOptions("install", io([]))).surface, null);
});
