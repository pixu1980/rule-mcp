

/** Branch coverage for the renumber report's clean, author and index-only arms. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { renderRenumberPlan } from "../_render.js";

const plan = (overrides = {}) => ({
  collisions: [],
  gaps: [],
  renames: [],
  authors: [],
  indexUnordered: false,
  indexStale: false,
  handoffIndexUnordered: false,
  handoffIndexStale: false,
  projectDir: process.cwd(),
  ...overrides,
});

test("a clean tree with no authors is one sentence", () => {
  assert.match(renderRenumberPlan(plan()), /Numbering is clean/u);
});

test("a clean tree with authors appends the author lines", () => {
  const text = renderRenumberPlan(plan({ authors: [{ file: "docs/adr/001-x.md", current: "", author: "Ada" }] }));

  assert.match(text, /Numbering is clean/u);
  assert.match(text, /1 ADR\(s\) name a tool or nobody/u);
  assert.match(text, /Ada/u);
  assert.match(text, /Run with --fix/u);
});

test("an index-only repair names the file and can suppress the fix hint", () => {
  const behind = renderRenumberPlan(plan({ indexStale: true }));

  assert.match(behind, /generated index is behind/u);
  assert.match(behind, /docs\/adr\/ADR\.md/u);
  assert.match(behind, /Run with --fix/u);

  const ordered = renderRenumberPlan(plan({ indexUnordered: true, handoffIndexUnordered: true, authors: [{ file: "x", current: "", author: "Ada" }], projectDir: process.cwd() }), {
    fix: true,
  });

  assert.match(ordered, /runs out of order/u);
  assert.match(ordered, /docs\/handoff\/HANDOFF\.md/u);
  assert.doesNotMatch(ordered, /Run with --fix/u);
});
