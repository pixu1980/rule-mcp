/** Detection and the dry-run report: what the doctor says before it touches anything. */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { renderRenumberPlan, planRenumber, staleCommitReferences } from "../../../src/core/docs-numbering/index.js";
import { git, seedRepo, seedScrambledIndex } from "./_doctor.fixture.mjs";

test("a clean tree reports nothing to do", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-clean-"));
  try {
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "001-one.md"), "# 001: One\n");
    writeFileSync(join(root, "docs", "adr", "002-two.md"), "# 002: Two\n");
    const plan = planRenumber({ projectDir: root });
    assert.deepEqual(plan.collisions, []);
    assert.deepEqual(plan.renames, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("collisions are detected and ordered by creation, not by name", () => {
  const root = seedRepo();
  try {
    const plan = planRenumber({ projectDir: root });
    assert.equal(plan.collisions.length, 2, "one ADR collision and one handoff collision");
    const adr = plan.renames.find((rename) => rename.from.endsWith("069-personas.md"));
    assert.ok(adr, "the later 069 is the one that moves");
    assert.match(adr.to, /070-personas\.md$/, "it takes the next free number");
    assert.ok(
      plan.renames.every((rename) => !rename.from.endsWith("069-input-cap.md")),
      "the earlier document keeps its number",
    );
    const handoff = plan.renames.find((rename) => rename.from.endsWith("02-beta.md"));
    assert.match(handoff.to, /03-beta\.md$/, "handoffs renumber on their own sequence");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a dry run changes nothing on disk", () => {
  const root = seedRepo();
  try {
    planRenumber({ projectDir: root });
    assert.ok(existsSync(join(root, "docs", "adr", "069-personas.md")), "dry run leaves the file where it was");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the report says nothing when there is nothing to renumber", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-clean-"));
  git(["init", "--quiet", "--initial-branch=main"], root);
  git(["config", "user.email", "t@example.com"], root);
  git(["config", "user.name", "T"], root);
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "docs/adr/001-only.md"), "# 001: Only\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): add 001"], root);

  assert.deepEqual(staleCommitReferences(planRenumber({ projectDir: root }), { projectDir: root }), []);
});

// ── The index the renumber has to regenerate ──

test("the report does not tell a caller running --fix to run --fix", () => {
  const unordered = planRenumber({ projectDir: seedScrambledIndex() });
  assert.match(renderRenumberPlan(unordered), /--fix/, "report mode says how to repair it");
  assert.doesNotMatch(renderRenumberPlan(unordered, { fix: true }), /Run with --fix/, "and --fix mode does not");

  const collisions = planRenumber({ projectDir: seedRepo() });
  assert.match(renderRenumberPlan(collisions), /Run with --fix/);
  assert.doesNotMatch(renderRenumberPlan(collisions, { fix: true }), /Run with --fix/);
});

// ── The author field, and a repair that runs after the renaming is done ──
