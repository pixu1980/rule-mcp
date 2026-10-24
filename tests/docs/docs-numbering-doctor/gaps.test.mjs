/**
 * Holes in the sequence: the doctor used to call them clean.
 *
 * `planRenumber` only ever compared a number against the ones already taken,
 * so it saw duplicates and nothing else. A repository that had deleted three
 * ADRs reported "Numbering is clean" while 007, 053 and 054 were missing, and
 * `nextAdrNumber` is `max + 1`, so every deletion leaves a permanent hole.
 *
 * Compaction preserves the existing order rather than re-deriving it from
 * creation dates: closing a hole must move the documents after it down by one,
 * never reshuffle which decision holds which number.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { applyRenumber, planRenumber, renderRenumberPlan } from "../../../src/core/docs-numbering/index.js";
import { seedGappedRepo } from "./_doctor.fixture.mjs";

const read = (root, path) => readFileSync(join(root, path), "utf8");

test("a hole in the sequence is reported, with the numbers that are missing", () => {
  const root = seedGappedRepo();

  try {
    const plan = planRenumber({ projectDir: root });
    const adr = plan.gaps.filter((gap) => gap.family === "ADR");

    assert.deepEqual(
      adr.map((gap) => gap.number),
      ["002", "005"],
      "both holes, in order",
    );
    assert.deepEqual(
      plan.gaps.filter((gap) => gap.family === "handoff"),
      [],
      "a family with no hole reports none",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("closing a hole moves the documents after it down, and only those", () => {
  const root = seedGappedRepo();

  try {
    const plan = planRenumber({ projectDir: root });
    const moves = plan.renames.map((rename) => `${rename.fromNumber}->${rename.toNumber}`);

    assert.deepEqual(moves, ["003->002", "004->003", "006->004"], "001 keeps its number, the rest close up");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a sequence with no hole and no duplicate plans nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-doctor-dense-"));

  try {
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "001-one.md"), "# 001: One\n");
    writeFileSync(join(root, "docs", "adr", "002-two.md"), "# 002: Two\n");

    const plan = planRenumber({ projectDir: root });
    assert.deepEqual(plan.renames, []);
    assert.deepEqual(plan.gaps, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the oldest document anchors the sequence, so a family may start where it likes", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-doctor-offset-"));

  try {
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "003-three.md"), "# 003: Three\n");
    writeFileSync(join(root, "docs", "adr", "004-four.md"), "# 004: Four\n");

    const plan = planRenumber({ projectDir: root });

    // A family that starts at 003 is numbered, not broken. Dragging it to 001
    // would rewrite both identities to reclaim numbers nobody lost.
    assert.deepEqual(plan.gaps, [], "the space before the first document is not a hole");
    assert.deepEqual(plan.renames, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applying the plan renames the files, their headers and the references", () => {
  const root = seedGappedRepo();

  try {
    const plan = planRenumber({ projectDir: root });
    const applied = applyRenumber(plan, { projectDir: root });

    assert.equal(applied.renamed, 3);
    assert.ok(existsSync(join(root, "docs/adr/002-third.md")), "003 became 002");
    assert.ok(existsSync(join(root, "docs/adr/003-fourth.md")), "004 became 003");
    assert.ok(existsSync(join(root, "docs/adr/004-sixth.md")), "006 became 004");
    assert.ok(!existsSync(join(root, "docs/adr/006-sixth.md")), "and its old name is gone");

    assert.match(read(root, "docs/adr/002-third.md"), /^# 002: third/m, "the header follows the filename");
    assert.match(read(root, "docs/adr/001-first.md"), /\[004\]\(004-sixth\.md\)/, "a reference to a moved document follows it");

    const after = planRenumber({ projectDir: root });
    assert.deepEqual(after.gaps, [], "the sequence is dense afterwards");
    assert.deepEqual(after.renames, [], "and a second run has nothing left to do");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the report names the holes and says what closing them costs", () => {
  const root = seedGappedRepo();

  try {
    const rendered = renderRenumberPlan(planRenumber({ projectDir: root }));

    assert.match(rendered, /002/, "the missing numbers are named");
    assert.match(rendered, /005/);
    assert.doesNotMatch(rendered, /Numbering is clean/, "a gapped tree is not clean");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
