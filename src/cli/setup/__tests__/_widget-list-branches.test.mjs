

/**
 * Branch coverage for the selection widgets: the windowed slice, the note
 * without a chosen color, a heading with no id, and the detail panel with no
 * row under the cursor.
 *
 * Rendered into the fake terminal the wizard tests use, so what is asserted is
 * the frame a user would see rather than the element tree behind it.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { render } from "ink";

import { FakeStdin, FakeStdout, settle } from "./_fake-terminal.fixture.mjs";
import { h } from "../_h.js";
import { GLYPHS } from "../_theme.js";
import { DetailPanel, ListDetail, SelectList, windowFor } from "../_widget-list.js";

/** Render one component into a fake terminal and hand back the frame. */
function mount(Component, props) {
  const stdout = new FakeStdout({ columns: 100, rows: 30 });
  const stdin = new FakeStdin();
  const instance = render(h(Component, props), { stdout, stdin, debug: true, exitOnCtrlC: false, patchConsole: false });

  return { stdout, stdin, instance };
}

test("a list shorter than the window shows all of it", () => {
  assert.deepEqual(windowFor(3, 0, 5), { start: 0, end: 3 });
  assert.deepEqual(windowFor(5, 4, 5), { start: 0, end: 5 }, "an exact fit is still the whole list");
});

test("a long list keeps the cursor inside the slice", () => {
  assert.deepEqual(windowFor(20, 0, 5), { start: 0, end: 5 }, "the top clamps at zero");
  assert.deepEqual(windowFor(20, 10, 5), { start: 8, end: 13 }, "the cursor sits mid-window");
  assert.deepEqual(windowFor(20, 19, 5), { start: 15, end: 20 }, "the bottom clamps at the last row");
});

test("a row with a note and no chosen color renders the note", async () => {
  const { stdout, instance } = mount(SelectList, {
    items: [
      { id: "a", label: "alpha", note: "3 skills" },
      { id: "b", label: "beta" },
    ],
    cursor: 0,
    selected: new Set(["a"]),
    height: 5,
  });

  await settle();

  const frame = stdout.lastFrame;

  assert.match(frame, /alpha/);
  assert.match(frame, /3 skills/, "the note falls back to the muted color, not to nothing");
  assert.match(frame, /beta/);
  assert.ok(frame.includes(GLYPHS.checked) && frame.includes(GLYPHS.unchecked), "ticked and unticked rows carry their mark");
  assert.ok(frame.includes(GLYPHS.pointer), "the row under the cursor is pointed at");

  instance.unmount();
});

test("a section heading with no id still renders and the tail is counted", async () => {
  const { stdout, instance } = mount(SelectList, {
    items: [
      { section: true, label: "Coding agents" },
      { id: "a", label: "alpha", note: "3" },
      { id: "b", label: "beta" },
    ],
    cursor: 1,
    selected: new Set(),
    height: 2,
  });

  await settle();

  const frame = stdout.lastFrame;

  assert.match(frame, /Coding agents/, "the heading needs no id to get a key");
  assert.match(frame, /alpha/);
  assert.doesNotMatch(frame, /\bbeta\b/, "the window cuts the last row");
  assert.match(frame, /1 more/, "and says how many it did not draw");

  instance.unmount();
});

test("a heading below the first row keeps the gap above it", async () => {
  const { stdout, instance } = mount(SelectList, {
    items: [
      { id: "a", label: "claude" },
      { section: true, label: "IDEs" },
      { id: "b", label: "vscode" },
    ],
    cursor: 0,
    selected: new Set(),
    height: 5,
  });

  await settle();

  assert.match(stdout.lastFrame, /IDEs/, "a later heading renders");
  assert.match(stdout.lastFrame, /vscode/, "and its rows follow it");

  instance.unmount();
});

test("a radio list marks the highlighted row and none other", async () => {
  const chosen = mount(SelectList, { items: [{ id: "a", label: "alpha" }], cursor: 0, selected: new Set(["a"]), mode: "radio", height: 5 });

  await settle();
  assert.ok(chosen.stdout.lastFrame.includes(GLYPHS.radioOn), "the chosen row is filled");
  assert.ok(!chosen.stdout.lastFrame.includes(GLYPHS.radioOff), "and no empty dot is drawn");
  chosen.instance.unmount();

  const empty = mount(SelectList, { items: [{ id: "a", label: "alpha" }], cursor: 0, selected: new Set(), mode: "radio", height: 5 });

  await settle();
  assert.ok(empty.stdout.lastFrame.includes(GLYPHS.radioOff), "an unticked radio row is empty");
  empty.instance.unmount();
});

test("a detail panel with no row under the cursor falls back to an empty title and body", () => {
  const tree = ListDetail({ items: [], cursor: 0, selected: new Set() });
  const panel = tree.props.children[1];

  assert.equal(panel.props.title, "", "no row means no title");
  assert.deepEqual(panel.props.lines, [], "and no body lines");
  assert.equal(panel.props.width, 40, "the width still comes from the column count");
});

test("a detail panel follows the row under the cursor", () => {
  const tree = ListDetail({ items: [{ id: "a", label: "Alpha", detail: ["first line"] }], cursor: 0, selected: new Set() });
  const panel = tree.props.children[1];

  assert.equal(panel.props.title, "Alpha", "the row's label is the title");
  assert.deepEqual(panel.props.lines, ["first line"], "and its detail is the body");
});

test("the detail panel draws every line it is given", async () => {
  const { stdout, instance } = mount(DetailPanel, { title: "claude", lines: ["mode stdio", "hooks on"], width: 30 });

  await settle();

  assert.match(stdout.lastFrame, /claude/);
  assert.match(stdout.lastFrame, /mode stdio/);
  assert.match(stdout.lastFrame, /hooks on/);

  instance.unmount();
});
