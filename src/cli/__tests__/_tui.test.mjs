/** The terminal surface helpers: color gates, truncation, banner, kv, table. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { banner, color, kv, section, shouldUseColor, table, truncate } from "../tui.js";

const PREV_NO_COLOR = process.env.NO_COLOR;
const PREV_FORCE_COLOR = process.env.FORCE_COLOR;

test.after(() => {
  if (PREV_NO_COLOR === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = PREV_NO_COLOR;
  }
  if (PREV_FORCE_COLOR === undefined) {
    delete process.env.FORCE_COLOR;
  } else {
    process.env.FORCE_COLOR = PREV_FORCE_COLOR;
  }
});

test("color respects NO_COLOR and FORCE_COLOR", () => {
  delete process.env.FORCE_COLOR;
  process.env.NO_COLOR = "1";
  assert.equal(shouldUseColor(), false, "NO_COLOR disables color");
  assert.equal(color("x", "green"), "x", "plain text without color");

  delete process.env.NO_COLOR;
  process.env.FORCE_COLOR = "1";
  assert.equal(shouldUseColor(), true, "FORCE_COLOR enables color");
  assert.equal(color("x", "green"), "\u001B[32mx\u001B[0m", "wrapped text with color");
});

test("an unknown tone degrades to plain text with a reset", () => {
  process.env.FORCE_COLOR = "1";
  assert.equal(color("x", "chartreuse"), "x\u001B[0m", "no ANSI prefix for the unknown tone");
});

/** Force plain output: NO_COLOR / FORCE_COLOR / TTY decide color, never a test. */
function noColor() {
  delete process.env.FORCE_COLOR;
  delete process.env.NO_COLOR;
}

test("truncate collapses whitespace, shortens over the limit and tolerates null", () => {
  noColor();
  assert.equal(truncate(null), "", "null renders empty");
  assert.equal(truncate("a   b\nc"), "a b c", "inner whitespace collapses");
  assert.equal(truncate("x".repeat(90)), "x".repeat(79) + "...", "over the limit shortens");
  assert.equal(truncate("short", 80), "short", "under the limit passes");
});

test("banner grows with long titles and renders the dim subtitle", () => {
  noColor();
  const plain = banner("Short title");
  assert.match(plain, /╔═+╗/, "the banner opens with a top edge");
  assert.doesNotMatch(plain, /dim/, "no subtitle, no dim line");

  const withSub = banner("A very long title that should widen the banner box", "subtitle line");
  assert.match(withSub, /subtitle line/, "the subtitle is rendered");
  assert.ok(withSub.length > plain.length, "a longer title widens the banner");
});

test("section renders the icon, bold title and a dim underline", () => {
  noColor();
  const out = section("System", "🖥️");
  assert.ok(out.includes("System"), "the title renders");
  assert.match(out, /─+/, "the underline renders");
});

test("kv aligns keys and passes values through", () => {
  noColor();
  const out = kv([
    ["abc", "1"],
    ["x", "2"],
  ]);
  assert.match(out, /abc {2}1/, "the first key renders inline with its value");
  assert.match(out, /x +2/, "the shorter key is padded to the longest");
});

test("table pads, clamps widths and tolerates short rows", () => {
  noColor();
  const out = table(["a", "bbbb"], [["1", "two"]], {});
  const lines = out.split("\n");
  assert.match(lines[0], /a {2}bbbb/, "headers are padded to the column width");
  assert.match(lines[2], /1 {2}two/, "cells are padded to the column width");

  const clamped = table(["long header one", "long header two"], [["long cell", "long cell two"]], { maxWidth: 8 });
  assert.match(clamped, /long ce\.\.\./, "the last cell truncates to the width");

  const shortRow = table(["a", "b"], [["only"]]);
  assert.ok(shortRow.includes("only"), "a short row renders what it has");
});
