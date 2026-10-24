

/** Branch coverage for the blank-line block fixer. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { apply } from "../_blank-blocks.js";

test("a blank line is inserted before an opener after a statement", () => {
  const { text, changed } = apply("const x = 1;\nif (x) {\n  y();\n}\n");
  assert.equal(typeof changed, "boolean");
  assert.match(text, /const x = 1;\n\nif \(x\)/u);
});

test("scaffolding and comments do not get a leading blank", () => {
  assert.doesNotMatch(apply("function f() {\n  if (x) {\n    y();\n  }\n}").text, /\n\n {2}if/u);
  assert.doesNotMatch(apply("// c\nif (x) {}").text, /\n\nif/u);
});

test("a block followed by code gets a blank after it", () => {
  assert.match(apply("if (x) {\n}\nz();").text, /\}\n\nz\(\);/u);
  assert.match(apply("promise\n.then((x) => x);").text, /promise\n\n\.then/u);
});

test("a block followed by a comment, brace, or nothing is left alone", () => {
  assert.equal(apply("if (x) {\n}\n// c\nz();").text, "if (x) {\n}\n// c\nz();");
  assert.equal(apply("if (x) {\n}\n}").text, "if (x) {\n}\n}");
  assert.equal(apply("if (x) {\n}\n").text, "if (x) {\n}\n");
});

test("the fixer settles across passes", () => {
  const once = apply("const a = 1;\nif (a) {\n}\nb();");
  const twice = apply(once.text);
  assert.equal(twice.text, once.text);
  assert.equal(apply("const a = 1;\n").changed, false);
});
