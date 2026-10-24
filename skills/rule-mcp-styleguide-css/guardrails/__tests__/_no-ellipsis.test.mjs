

/** The css-no-ellipsis guardrail: prose wraps, it is never truncated. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { cssNoEllipsis } from "../_no-ellipsis.js";
import { GUARDRAIL_HELPERS } from "@src/core/guardrails/_helpers.js";

const check = (code, context = {}) => cssNoEllipsis.check(code, { helpers: GUARDRAIL_HELPERS, ...context });

test("a wrapping rule passes", () => {
  const css = "[data-part='name'] { white-space: normal; overflow-wrap: anywhere; }";

  assert.equal(check(css, { fileName: "a.css" }).pass, true, "wrapping is what the rule asks for");
});

test("text-overflow: ellipsis is reported", () => {
  const result = check("[data-part='name'] { overflow: hidden; text-overflow: ellipsis; }", { fileName: "a.css" });

  assert.equal(result.pass, false, "a truncated label fails the rule");
  assert.equal(result.failCount, 1, "one finding per declaration");
  assert.match(result.suggestion, /wrap/, "the suggestion names wrapping");
});

test("a line clamp is reported too", () => {
  assert.equal(check("[data-part='name'] { -webkit-line-clamp: 2; }", { fileName: "a.css" }).pass, false, "a clamped line loses its end just as well");
});

test("a stylesheet handed over without a name is still read", () => {
  assert.equal(check("[data-part='name'] { text-overflow: ellipsis; }").pass, false, "a bare stylesheet is checked");
});

test("every other text-overflow value passes", () => {
  assert.equal(check("[data-part='name'] { text-overflow: clip; }", { fileName: "a.css" }).pass, true, "only the ellipsis leaves a mark where the text was cut");
});
