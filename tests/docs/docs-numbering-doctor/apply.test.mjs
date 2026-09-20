/** Applying the plan: renames, headers, references and the regenerated ADR index. */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { planRenumber, applyRenumber } from "../../../src/core/docs-numbering/index.js";
import { seedRepo } from "./_doctor.fixture.mjs";

test("applying moves the file, fixes its header, and follows the references", () => {
  const root = seedRepo();
  try {
    const plan = planRenumber({ projectDir: root });
    const result = applyRenumber(plan, { projectDir: root });
    assert.equal(result.renamed, 2, "one ADR collision and one handoff collision, one move each");
    assert.ok(existsSync(join(root, "docs", "adr", "070-personas.md")));
    assert.ok(!existsSync(join(root, "docs", "adr", "069-personas.md")));
    const moved = readFileSync(join(root, "docs", "adr", "070-personas.md"), "utf8");
    assert.match(moved, /^# 070: Personas/m, "the header carries the new number");
    const index = readFileSync(join(root, "docs", "adr", "ADR.md"), "utf8");
    assert.match(index, /069-input-cap\.md/, "a reference to an unmoved document is left alone");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a link to a renumbered document is rewritten", () => {
  const root = seedRepo();
  try {
    writeFileSync(join(root, "docs", "adr", "068-first.md"), "# 068: First\n\nSee [069](069-personas.md).\n");
    const plan = planRenumber({ projectDir: root });
    applyRenumber(plan, { projectDir: root });
    const referrer = readFileSync(join(root, "docs", "adr", "068-first.md"), "utf8");
    assert.match(referrer, /\[070\]\(070-personas\.md\)/, "both the label and the target move");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── The commit messages a renumber leaves behind ──

test("applying regenerates the ADR index instead of patching its links", () => {
  const root = seedRepo();
  // A hand-patched index is what ADR 051 retired: the rows, the titles and the
  // order all come from the files, so the repair regenerates rather than edits.
  const plan = planRenumber({ projectDir: root });
  const result = applyRenumber(plan, { projectDir: root });

  const index = readFileSync(join(root, "docs/adr/ADR.md"), "utf8");
  assert.match(index, /070-personas\.md/, "the moved document is in the index under its new number");
  assert.doesNotMatch(index, /069-personas\.md/, "and not under the old one");
  assert.match(index, /069-input-cap\.md/, "the document that kept 069 is still there");
  assert.equal(result.indexRegenerated, true, "the result says the index was rebuilt");

  // Every table in the index is newest first. Patching links in place would have
  // left the renumbered row where the old number sorted, which is the reason
  // this regenerates instead of editing.
  // The index holds several tables, each newest first, so the check is per run
  // of adjacent rows rather than over the file.
  const runs = [];

  for (const line of index.split("\n")) {
    const row = line.match(/^\| \[(\d{3})\]/);

    if (row) {
      (runs.at(-1)?.open ? runs.at(-1) : runs[runs.push({ open: true, numbers: [] }) - 1]).numbers.push(Number(row[1]));
      continue;
    }

    if (runs.at(-1)) {
      runs.at(-1).open = false;
    }
  }

  const ordered = runs.filter((run) => run.numbers.length > 1);
  assert.ok(ordered.length > 0, "the index has a table with rows to order");

  for (const run of ordered) {
    assert.deepEqual(
      run.numbers,
      [...run.numbers].sort((a, b) => b - a),
      "each table runs newest first",
    );
  }
});

test("a missing ADR index is created, not just refreshed", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-no-index-"));

  try {
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs/adr/001-one.md"), "# 001: One\n\n- **Date**: 2026-09-04\n- **Status**: accepted\n- **Tags**: fixture\n");

    const plan = planRenumber({ projectDir: root });

    assert.equal(plan.indexStale, true, "a family with no index is stale by definition");

    const result = applyRenumber(plan, { projectDir: root });

    assert.equal(result.indexRegenerated, true);
    assert.match(readFileSync(join(root, "docs/adr/ADR.md"), "utf8"), /\[001\]/, "the index exists and lists the ADR");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── Commit messages: reported always, rewritten only when asked ──
