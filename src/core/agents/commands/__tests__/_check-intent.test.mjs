/** @module test/check-intent */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { CHECK_INTENT_KEYWORDS, hasCheckIntent } from "../_check-intent.js";

test("detects English and Italian check keywords as whole tokens", () => {
  assert.equal(hasCheckIntent("check this file"), true);
  assert.equal(hasCheckIntent("Please CONTROLLA src/App.js"), true);
  assert.equal(hasCheckIntent("validate the form"), true);
  assert.equal(hasCheckIntent("verifica i guardrails"), true);
  assert.equal(hasCheckIntent("run lint on the diff"), true);
});

test("ignores substrings that are not whole tokens", () => {
  assert.equal(hasCheckIntent("checkbox layout"), false);
  assert.equal(hasCheckIntent("unchecked optional"), false);
  assert.equal(hasCheckIntent("build a checklist"), false);
});

test("empty or non-string is not check intent", () => {
  assert.equal(hasCheckIntent(""), false);
  assert.equal(hasCheckIntent(null), false);
  assert.equal(hasCheckIntent(), false);
});

test("the exported keyword list stays non-empty and lowercase", () => {
  assert.ok(CHECK_INTENT_KEYWORDS.length >= 10);

  for (const word of CHECK_INTENT_KEYWORDS) {
    assert.equal(word, word.toLowerCase());
    assert.ok(!/\s/.test(word));
  }
});
