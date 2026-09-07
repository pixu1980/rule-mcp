/** DOC-1: substance includes the meaning of a sentence - no broken English left behind. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { compressResult } from "./_efficacy.fixture.mjs";

// ── DOC-1: substance includes the meaning of a sentence ──

test("compression never leaves broken English behind", () => {
  // Found by the docs-engineer run: `rather` is filler on its own and half of a
  // comparative when `than` follows it, and deleting "in order to" outright ate
  // the "to" the verb needed. 144 occurrences across 34 skills shipped that way.
  const compress = (text) => compressResult({ content: [{ type: "text", text }] }).content[0].text;

  for (const [source, expected] of [
    ["Call the helper rather than writing it by hand.", "Call helper rather than writing it by hand."],
    ["Use a Set in order to check membership in a loop.", "Use Set to check membership in loop."],
    ["The plan is listed in order of leverage.", "plan is listed in order of leverage."],
  ]) {
    assert.equal(compress(source), expected, `compression must not break: ${source}`);
  }
});

test("the filler words that are only ever filler still go", () => {
  const compress = (text) => compressResult({ content: [{ type: "text", text }] }).content[0].text;

  assert.equal(compress("The value is very large."), "value is large.");
  assert.equal(compress("This is quite simply the only path."), "This is only path.");
  assert.equal(compress("It is rather slow."), "It is slow.", "rather is still filler when no than follows");
});
