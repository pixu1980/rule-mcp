/**
 * Where the cursor starts, and which rows a tick may land on.
 *
 * Both are pure, and both decide something the wizard cannot take back: a
 * radio list answers its question with whatever row is highlighted, and a tick
 * on a disabled row is a promise the install would not keep.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { enabledIds, initialCursor } from "../_use-selection.js";

const ITEMS = [{ section: true, label: "Coding agents" }, { id: "claude" }, { id: "codex", disabled: true }, { section: true, label: "Editors" }, { id: "zed" }];
const INDEXES = [1, 2, 4];

test("the cursor starts on the first selectable row, stepping over a heading", () => {
  assert.equal(initialCursor(ITEMS, INDEXES), 1, "row 0 is a heading");
});

test("a check list ignores the incoming value and starts at the top", () => {
  assert.equal(initialCursor(ITEMS, INDEXES, ["zed"], "check"), 1, "a tick is a separate keystroke, so the cursor does not follow it");
});

test("a radio list starts on the row the caller already chose", () => {
  assert.equal(initialCursor(ITEMS, INDEXES, ["zed"], "radio"), 4, "the highlighted row is the answer, so it has to be the incoming one");
});

test("a radio list whose value is not on the list falls back to the first row", () => {
  assert.equal(initialCursor(ITEMS, INDEXES, ["not-here"], "radio"), 1);
});

test("a radio list will not start on a row that is only a heading", () => {
  assert.equal(initialCursor(ITEMS, INDEXES, [], "radio"), 1, "an empty initial is the same as none");
});

test("a list with nothing selectable puts the cursor at zero rather than undefined", () => {
  assert.equal(initialCursor([{ section: true }], [], [], "check"), 0);
  assert.equal(initialCursor([], [], ["x"], "radio"), 0);
});

test("only enabled, non-heading rows can be ticked", () => {
  assert.deepEqual(enabledIds(ITEMS), ["claude", "zed"], "the heading and the disabled row are out");
});

test("a list of headings alone offers nothing to tick", () => {
  assert.deepEqual(enabledIds([{ section: true }, { section: true }]), []);
});
