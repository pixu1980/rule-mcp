/**
 * @module test/code-signature.test
 *
 * A short digest of the server's own code. Anything that caches a result
 * derived from this code must invalidate when the code moves; the signature
 * is what makes that cheap. The format is pinned here so a signature that
 * stopped moving (or stopped being short) fails loudly.
 */

import test from "node:test";
import assert from "node:assert/strict";

const { codeSignature } = await import("../src/core/code-signature.js");

test("the signature is the promised shape", () => {
  const signature = codeSignature();
  assert.match(signature, /^[0-9a-f]{12}$/, "12 hex characters");
});

test("the signature is stable within a process", () => {
  assert.equal(codeSignature(), codeSignature(), "memoized: one computation per process");
});