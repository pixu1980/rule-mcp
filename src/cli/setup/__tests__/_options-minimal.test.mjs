/**
 * The `--minimal` / `--no-minimal` tri-state for the install path.
 *
 * Absent is not "full": it is "leave the saved server config alone", which is
 * why the option is `undefined` rather than `false` when no flag was given -
 * the same contract `--skills` / `--no-skills` already keeps.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { applyMinimalEnv, resolveSetupOptions } from "../_options.js";
import { MINIMAL_ENV_VAR } from "../../installers/index.js";

test("minimal is undefined when no flag was given", () => {
  assert.equal(resolveSetupOptions({}).minimal, undefined, "absent means untouched, not full");
});

test("minimal passes the flag through untouched", () => {
  assert.equal(resolveSetupOptions({ minimal: true }).minimal, true);
  assert.equal(resolveSetupOptions({ minimal: false }).minimal, false);
});

test("applyMinimalEnv writes 1 for true", () => {
  const env = {};

  applyMinimalEnv(true, env);

  assert.equal(env[MINIMAL_ENV_VAR], "1");
});

test("applyMinimalEnv writes 0 for false", () => {
  const env = {};

  applyMinimalEnv(false, env);

  assert.equal(env[MINIMAL_ENV_VAR], "0", "explicit false clears a saved 1 downstream");
});

test("applyMinimalEnv touches nothing when the flag was absent", () => {
  const empty = {};

  applyMinimalEnv(undefined, empty);

  assert.deepEqual(empty, {}, "absent adds no key");

  const ambient = { [MINIMAL_ENV_VAR]: "1" };

  applyMinimalEnv(undefined, ambient);

  assert.equal(ambient[MINIMAL_ENV_VAR], "1", "absent never clobbers an ambient value");
});
