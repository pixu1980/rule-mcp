

/**
 * The surface answer rides the setup options next to `minimal`.
 *
 * Null is untouched, like every other answer the wizard may skip: the
 * Surface step replaces it with what it was told, the flag with its spec.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { resolveSetupOptions } from "../_options.js";

test("surface is null when nobody answered", () => {
  assert.equal(resolveSetupOptions({}).surface, null);
});

test("surface passes through untouched", () => {
  const surface = { areas: ["frontend"] };

  assert.equal(resolveSetupOptions({ surface }).surface, surface);
});
