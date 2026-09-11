

/** withTimeout and trySafe on raw promises and non-Error throws. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { trySafe, withTimeout } from "../_sandbox.js";

test("withTimeout accepts a bare promise as well as a thunk", async () => {
  assert.equal(await withTimeout(Promise.resolve("value"), 1000, "bare"), "value", "a promise passes through");
  assert.equal(await withTimeout(() => Promise.resolve("thunk"), 1000, "thunk"), "thunk", "a thunk is invoked");
});

test("trySafe never throws, even for bare promises and string failures", async () => {
  const bare = await trySafe(Promise.resolve(7));
  assert.deepEqual(bare, { ok: true, value: 7 }, "a bare promise resolves like a thunk");

  const thrown = await trySafe(() => {
    throw "string-fail";
  });
  assert.equal(thrown.ok, false, "a string throw still reports failure");
  assert.equal(thrown.error, "string-fail", "a message-less failure stringifies");
});
