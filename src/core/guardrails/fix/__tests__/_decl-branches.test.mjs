

/** Branch coverage for the declaration continuation predicate. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { CONTINUES, DECL } from "../_decl.js";

test("every continuation shape continues the declaration", () => {
  for (const line of ["", "   ", "}", "const a = {", "const a = (", "return"]) {
    assert.equal(CONTINUES(line), true, `${JSON.stringify(line)} continues`);
  }
});

test("a complete single-line declaration does not continue", () => {
  assert.equal(CONTINUES("const a = 1;"), false);
});

test("the declaration opener matches the shapes the fixer extends", () => {
  assert.equal(DECL.test("const a = 1;"), true);
  assert.equal(DECL.test("  export function f() {"), true);
  assert.equal(DECL.test("a = 1;"), false);
});
