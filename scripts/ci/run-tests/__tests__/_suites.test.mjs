/**
 * @module test/skills-suites
 *
 * The asset trees under skills/ ship their own node:test files, and a guard
 * nobody runs is not a guard: the 102 template-engine tests that cover its four
 * largest modules were matched by no suite until ARCH-7 needed them to split
 * those modules. These tests hold the wiring to account, and hold the exclusion
 * list short: an exclusion is a stated reason a file is another runner's, not a
 * place to park a red test.
 */
import { strict as assert } from "node:assert";
import { globSync, readFileSync } from "node:fs";
import test from "node:test";

import { expandSuite } from "../_expand.mjs";
import { SUITES } from "../_suites.data.mjs";

/** Every test file under skills/, by extension, because the trees use both. */
function skillsTestFiles() {
  return [...new Set(["skills/**/*.test.js", "skills/**/*.test.mjs"].flatMap((pattern) => globSync(pattern)))].sort();
}

/**
 * Whether a file is this repo's to run: a `node:test` file, as opposed to a
 * Playwright spec or a vitest example that ships for the user's project and
 * needs a runner this repo does not run.
 *
 * @param {string} file
 * @returns {boolean}
 */
function isNodeTest(file) {
  return /from\s+["']node:test["']/.test(readFileSync(file, "utf8"));
}

test("every node:test file under skills runs in the suite", () => {
  const running = new Set(expandSuite("all").files);
  const missing = skillsTestFiles()
    .filter(isNodeTest)
    .filter((file) => !running.has(file));

  assert.deepEqual(missing, [], `no suite runs these node:test files: ${missing.join(", ")}`);
});

test("a file with another runner's test vocabulary stays out of node --test", () => {
  const running = new Set(expandSuite("all").files);
  const wrong = skillsTestFiles()
    .filter((file) => !isNodeTest(file))
    .filter((file) => running.has(file));

  assert.deepEqual(wrong, [], `these belong to Playwright or vitest, not this runner: ${wrong.join(", ")}`);
});

test("an exclusion names a file that exists, so a rename cannot leave it behind", () => {
  for (const id of Object.keys(SUITES)) {
    assert.deepEqual(expandSuite(id).absent, [], `${id} excludes a file that no longer exists`);
  }
});
