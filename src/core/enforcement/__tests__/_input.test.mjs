

/** The argument guards: depth, key count, plain objects, for scanning. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { assertSafeValue, normalizeArguments } from "../_input.js";

const state = () => ({ keys: 0 });

test("assertSafeValue accepts plain strings, numbers and deep objects", () => {
  assert.doesNotThrow(() => assertSafeValue("plain", state()));
  assert.doesNotThrow(() => assertSafeValue({ a: { b: [{ c: 1 }] } }, state()));
});

test("assertSafeValue rejects NUL bytes, forbidden keys and prototypes", () => {
  assert.throws(() => assertSafeValue("bad\u0000byte", state()), /NUL/, "NUL control bytes are refused");
  assert.throws(() => assertSafeValue(JSON.parse('{"__proto__": {"x": 1}}'), state()), /forbidden/, "pollution keys are refused");
  assert.throws(() => assertSafeValue(new Date(), state()), /plain objects/, "a class instance is refused");
  assert.doesNotThrow(() => assertSafeValue(Object.create(null), state()), "a null-prototype object is allowed");
});

test("assertSafeValue rejects excessive nesting and key counts", () => {
  const deep = { a: 1 };
  let cursor = deep;
  for (let index = 0; index < 14; index++) {
    cursor.child = { a: 1 };
    cursor = cursor.child;
  }
  assert.throws(() => assertSafeValue(deep, state()), /nesting/, "depth beyond the cap refuses");

  const many = {};
  for (let index = 0; index < 1006; index++) {
    many[`k${index}`] = 1;
  }
  assert.throws(() => assertSafeValue(many, state()), /keys/, "too many keys refuses");
});

test("normalizeArguments trims the fields the cache keys on", () => {
  const normalized = normalizeArguments({ prompt: "  hello  ", framework: " react ", code: "  keep  " });
  assert.equal(normalized.prompt, "hello", "the prompt is trimmed");
  assert.equal(normalized.framework, "react", "the framework is trimmed");
  assert.equal(normalized.code, "  keep  ", "a non-normalized field stays untouched");
});
