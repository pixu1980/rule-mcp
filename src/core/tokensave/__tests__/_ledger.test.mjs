/**
 * @module test/tokensave/ledger
 *
 * Contract for the savings ledger: parse the CLI JSON, and turn a failure
 * into a missing number rather than an error.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { tokensaveGain } from "../_ledger.js";

test("tokensaveGain parses the ledger", () => {
  const exec = () => JSON.stringify({ saved_tokens: 10, calls: 2, usd: 0.01 });
  const gain = tokensaveGain("/tmp/p", { exec });

  assert.equal(gain.saved_tokens, 10);
  assert.equal(gain.calls, 2);
});

test("tokensaveGain returns null when the command fails", () => {
  const exec = () => {
    throw new Error("boom");
  };

  assert.equal(tokensaveGain("/tmp/p", { exec }), null);
});
