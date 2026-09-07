/**
 * @module test/ascii-box
 *
 * The ASCII box aligner.
 *
 * A box drawn one column short reads as generated, because a person who cared
 * enough to draw a box notices the seam. It is also the only fingerprint in
 * this repository that a spell-check cannot see, so it needs its own pass and
 * its own guard.
 *
 * @see src/core/text/ascii-box/index.js - the transformer
 * @see src/core/guardrail-defs.js - fp-box-rectangular
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const { alignAsciiBoxes, findRaggedBoxes, displayWidth } = await import("../index.js");

/** @param {string} text @returns {string[]} */
const widths = (text) =>
  text
    .split("\n")
    .filter((line) => /[│┌└├╔╚╠║]/.test(line))
    .map((line) => displayWidth(line.trimEnd()));

test("a short top border is padded with its own fill character", () => {
  const ragged = ["┌────────────────────┐", "│   PASCAL CASE       │", "│   Class names        │", "└────────────────────┘"].join("\n");
  const fixed = alignAsciiBoxes(ragged);

  const [border, content] = fixed.split("\n", 2);
  assert.equal(new Set(widths(fixed)).size, 1, "every frame line ends in the same column");
  assert.ok(border.endsWith("─┐"), "a border line is padded with the dash it is drawn from");
  assert.ok(content.endsWith(" │"), "a content line is padded with spaces");
});

test("content is never truncated, only the short lines grow", () => {
  const ragged = ["┌───┐", "│ a very long line │", "└───┘"].join("\n");
  const fixed = alignAsciiBoxes(ragged);

  assert.ok(fixed.includes("a very long line"), "the long line survives intact");
  assert.equal(new Set(widths(fixed)).size, 1);
});

test("the pass is idempotent", () => {
  const once = alignAsciiBoxes(["┌──┐", "│ x  │", "└──┘"].join("\n"));
  assert.equal(alignAsciiBoxes(once), once);
});

test("two boxes at different indents keep their own widths", () => {
  const source = [
    "        ┌──────┐",
    "        │ small │",
    "        └──────┘",
    "            │",
    "┌────────────────────────────┐",
    "│ wide                        │",
    "└────────────────────────────┘",
  ].join("\n");
  const fixed = alignAsciiBoxes(source).split("\n");

  assert.ok(displayWidth(fixed[0]) < displayWidth(fixed[4]), "the small box is not stretched to the wide one");
  assert.equal(displayWidth(fixed[0]), displayWidth(fixed[2]), "the small box is square with itself");
  assert.equal(displayWidth(fixed[4]), displayWidth(fixed[6]), "the wide box is square with itself");
});

test("junctions in a border survive the padding", () => {
  const source = ["┌──────────┐", "│ a │ b     │", "└────┬─────┘"].join("\n");
  const fixed = alignAsciiBoxes(source).split("\n");

  assert.ok(fixed[2].includes("┬"), "the junction is still there");
  assert.equal(new Set(fixed.map((l) => displayWidth(l))).size, 1);
});

test("prose and markdown tables are left alone", () => {
  const source = "| a | b |\n|---|---|\n| 1 | 2 |\n\nText with a | pipe.";
  assert.equal(alignAsciiBoxes(source), source);
});

test("an unclosed box is reported, not invented shut", () => {
  const source = ["┌──────┐", "│ x   │"].join("\n");
  assert.equal(alignAsciiBoxes(source), source, "no bottom border is added");
});

test("findRaggedBoxes names every line short of the right edge", () => {
  const ragged = ["┌────┐", "│ x   │", "└────┘"].join("\n");
  const found = findRaggedBoxes(ragged);

  assert.equal(found.length, 2, "both borders are short of the content line");
  assert.deepEqual(
    found.map((entry) => entry.line),
    [1, 3],
    "one-indexed line numbers, in order",
  );
  assert.equal(found[0].width, 6);
  assert.equal(found[0].expected, 7);
});

test("an unclosed box is reported as such", () => {
  const found = findRaggedBoxes(["┌──────┐", "│ x   │"].join("\n"));

  assert.equal(found.length, 1);
  assert.equal(found[0].reason, "box never closes");
});

test("a clean box reports nothing", () => {
  assert.deepEqual(findRaggedBoxes(["┌────┐", "│ xx │", "└────┘"].join("\n")), []);
});

test("displayWidth counts a wide glyph as two columns", () => {
  assert.equal(displayWidth("ab"), 2);
  assert.equal(displayWidth("✅"), 2, "an emoji-presentation check mark is two columns");
  assert.equal(displayWidth("中"), 2, "a CJK ideograph is two columns");
  assert.equal(displayWidth("é"), 1, "a combining accent adds no width");
});

test("no tracked file ships a ragged box", () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.md", "*.js", "*.mjs", "*.sh", "*.ps1", "*.txt"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((file) => file && existsSync(file) && !file.startsWith("tests/fixtures/"));

  const ragged = files.flatMap((file) =>
    findRaggedBoxes(readFileSync(file, "utf8"))
      .filter((entry) => entry.reason !== "box never closes")
      .map((entry) => `${file}:${entry.line} is ${entry.width} columns, expected ${entry.expected}`),
  );

  assert.deepEqual(ragged, [], "run node scripts/fix/prose/index.mjs --apply");
  console.log(`  ${files.length} files, no ragged box`);
});
