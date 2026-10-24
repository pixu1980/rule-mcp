/** An ADR index that drifted out of order without any number collision. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { renderRenumberPlan, planRenumber, applyRenumber } from "../../../src/core/docs-numbering/index.js";
import { seedScrambledIndex } from "./_doctor.fixture.mjs";

test("an out-of-order index is reported even when no number collides", () => {
  const root = seedScrambledIndex();
  const plan = planRenumber({ projectDir: root });

  assert.equal(plan.renames.length, 0, "nothing collides in this repo");
  assert.equal(plan.indexUnordered, true, "but its rows are not newest first");
  assert.match(renderRenumberPlan(plan), /index/i, "and the report says so instead of calling the tree clean");
});

test("applying regenerates an out-of-order index with no renames to do", () => {
  const root = seedScrambledIndex();
  const result = applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });

  assert.equal(result.indexRegenerated, true);

  const rows = [...readFileSync(join(root, "docs/adr/ADR.md"), "utf8").matchAll(/^\| \[(\d{3})\]/gm)].map((m) => Number(m[1]));
  assert.deepEqual(rows.slice(0, 4), [82, 81, 80, 79], "every ADR is listed, newest first");
});

test("a matching index is left alone", () => {
  const root = seedScrambledIndex();
  applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });

  const second = planRenumber({ projectDir: root });
  assert.equal(second.indexUnordered, false, "regenerating twice finds nothing to do");
  assert.equal(second.indexStale, false, "and the regenerated index is what the generator would write");
  assert.match(renderRenumberPlan(second), /clean/i);
});

test("an index missing a row is stale even when its rows are in order", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-doctor-missing-"));

  try {
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs/adr/001-one.md"), "# 001: One\n\n- **Date**: 2026-09-04\n- **Status**: accepted\n- **Tags**: fixture\n");
    writeFileSync(join(root, "docs/adr/002-two.md"), "# 002: Two\n\n- **Date**: 2026-09-04\n- **Status**: accepted\n- **Tags**: fixture\n");
    writeFileSync(
      join(root, "docs/adr/ADR.md"),
      "# Decisions\n\n| ADR | Title | Date | Status | Tags |\n|-----|-------|------|--------|------|\n| [001](001-one.md) | One | 2026-09-04 | accepted | fixture |\n",
    );

    const plan = planRenumber({ projectDir: root });

    assert.equal(plan.indexUnordered, false, "the one row is in order");
    assert.equal(plan.indexStale, true, "but the index is missing a row");

    const result = applyRenumber(plan, { projectDir: root });

    assert.equal(result.indexRegenerated, true);
    assert.match(readFileSync(join(root, "docs/adr/ADR.md"), "utf8"), /\[002\]/, "the missing row is back");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
