// test/context-server-generator-parity.test.mjs
// Guards that context-server.mjs no longer carries its own generator: its
// generation must be the shared one from skills/rule-architect/generator.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../skills/rule-architect/assets/context-server.mjs", import.meta.url), "utf-8");

test("context-server imports the canonical generator", () => {
  assert.match(SRC, /from\s+["']\.\.\/generator\.mjs["']/);
});

test("context-server has no inline generator copy", () => {
  assert.doesNotMatch(SRC, /function\s+generateContextContent\s*\(/, "inline generateContextContent must be removed");
  assert.doesNotMatch(SRC, /function\s+generateContext\s*\(/, "inline generateContext must be removed");
});
