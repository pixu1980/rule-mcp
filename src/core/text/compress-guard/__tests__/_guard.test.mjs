

/** PERF-3: the deterministic guard - one case per invariant validate.py owns. */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { countBullets, extractCodeBlocks, extractHeadings, extractPaths, extractUrls, guardCompression } from "../index.js";

const errors = (result) => result.violations.filter((violation) => violation.severity === "error").map((violation) => violation.rule);
const warnings = (result) => result.violations.filter((violation) => violation.severity === "warning").map((violation) => violation.rule);

test("an unchanged text violates nothing", () => {
  const text = "# Title\n\nSee https://example.com/a and ./src/index.js.\n\n- one\n- two\n\n```js\nconst a = 1;\n```\n";
  const result = guardCompression(text, text);

  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test("a lost heading is an error", () => {
  const result = guardCompression("# One\n\n## Two\n", "# One\n");

  assert.equal(result.ok, false);
  assert.deepEqual(errors(result), ["headings"]);
});

test("a rewritten heading is a warning, not an error", () => {
  const result = guardCompression("# The title\n", "# title\n");

  assert.equal(result.ok, true);
  assert.deepEqual(warnings(result), ["headings"]);
});

test("a mutated code block is an error", () => {
  const result = guardCompression("```js\nconst the = 1;\n```\n", "```js\nconst = 1;\n```\n");

  assert.equal(result.ok, false);
  assert.deepEqual(errors(result), ["code-blocks"]);
});

test("a lost URL is an error", () => {
  const result = guardCompression("See https://example.com/a for the rest.\n", "See for rest.\n");

  assert.equal(result.ok, false);
  assert.ok(errors(result).includes("urls"));
});

test("a lost path is a tolerance, not an error", () => {
  const result = guardCompression("Edit ./src/index.js now.\n", "Edit now.\n");

  assert.equal(result.ok, true);
  assert.deepEqual(warnings(result), ["paths"]);
});

test("bullet drift beyond 15 percent is a tolerance", () => {
  const original = "- one\n- two\n- three\n- four\n- five\n- six\n- seven\n";

  assert.deepEqual(warnings(guardCompression(original, "- one\n- two\n- three\n")), ["bullets"]);
  assert.deepEqual(warnings(guardCompression(original, original.replace("- seven\n", "seven\n"))), [], "one bullet in seven is inside the tolerance");
});

test("a 4-backtick fence wraps 3-backtick content as one block", () => {
  const text = "````md\n```js\nconst a = 1;\n```\n````\n";
  const blocks = extractCodeBlocks(text);

  assert.equal(blocks.length, 1, "the outer fence owns the inner one");
  assert.equal(blocks[0], text.trimEnd());
});

test("a tilde fence closes only on tildes, and an unclosed fence is skipped", () => {
  assert.equal(extractCodeBlocks("~~~\nbody\n```\nmore\n~~~\n").length, 1);
  assert.deepEqual(extractCodeBlocks("```js\nconst a = 1;\n"), [], "an unclosed fence is malformed markdown, not a violation");
});

test("the extractors read what validate.py reads", () => {
  const text = "# One\n\n## Two\n\nhttps://example.com/x ./a/b.js\n\n- one\n* two\n+ three\n";

  assert.deepEqual(extractHeadings(text), ["# One", "## Two"]);
  assert.deepEqual([...extractUrls(text)], ["https://example.com/x"]);
  assert.ok(extractPaths(text).has("./a/b.js"));
  assert.equal(countBullets(text), 3);
});

// The python CLI is the port source; when it is installed, the two must agree.
const validatePy = join(homedir(), ".agents/skills/compression-reference/scripts/validate.py");
const hasPython = spawnSync("python3", ["--version"], { stdio: "ignore" }).status === 0;

test("the python validate.py CLI contract agrees with the guard", { skip: !(hasPython && existsSync(validatePy)) && "python3 or validate.py is not installed here" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-guard-cli-"));
  const cases = [
    ["# One\n\n## Two\n", "# One\n", false],
    ["See https://example.com/a here.\n", "See here.\n", false],
    ["# One\n\nplain prose here.\n", "# One\n\nprose here.\n", true],
  ];

  for (const [index, [original, compressed, expectValid]] of cases.entries()) {
    const originalPath = join(dir, `original-${index}.md`);
    const compressedPath = join(dir, `compressed-${index}.md`);
    writeFileSync(originalPath, original);
    writeFileSync(compressedPath, compressed);

    const out = spawnSync("python3", [validatePy, originalPath, compressedPath], { encoding: "utf8" }).stdout ?? "";
    const pythonValid = /Valid: True/.test(out);

    assert.equal(pythonValid, expectValid, `validate.py verdict for case ${index}`);
    assert.equal(guardCompression(original, compressed).ok, pythonValid, `the guard must match validate.py on case ${index}`);
  }
});
