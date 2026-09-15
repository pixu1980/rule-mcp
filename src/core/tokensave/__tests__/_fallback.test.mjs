/**
 * @module test/tokensave/fallback
 *
 * Contract for withFallback: TokenSave first, JavaScript when the graph is
 * unavailable, and a real error never silently swallowed.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { TokensaveUnavailableError } from "../_client.js";
import { withFallback } from "../_fallback.js";

test("withFallback returns the TokenSave answer when it succeeds", async () => {
  const result = await withFallback("impact", async () => ({ from: "tokensave" }), () => ({ from: "js" }));

  assert.deepEqual(result, { value: { from: "tokensave" }, path: "tokensave" });
});

test("withFallback calls the JavaScript path when TokenSave is unavailable", async () => {
  const result = await withFallback(
    "impact",
    async () => {
      throw new TokensaveUnavailableError("no graph");
    },
    () => ({ from: "js" }),
  );

  assert.deepEqual(result, { value: { from: "js" }, path: "javascript" });
});

test("withFallback propagates a real error", async () => {
  await assert.rejects(
    () =>
      withFallback(
        "impact",
        async () => {
          throw new Error("boom");
        },
        () => ({ from: "js" }),
      ),
    /boom/,
  );
});
