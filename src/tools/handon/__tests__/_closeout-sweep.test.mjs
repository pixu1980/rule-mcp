

/** Resuming a session sweeps the completed working papers, unless asked not to. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { git, handon, write } from "./_handon.fixture.mjs";
import "../../../../tests/fixtures/git-hermetic.mjs";

const HANDOFF = "docs/handoff/01-a-session.md";

/** How many files the ADR directory holds, zero when it was never created. */
function adrFiles(root) {
  try {
    return readdirSync(join(root, "docs/adr")).length;
  } catch {
    return 0;
  }
}

/** A persisted handoff plus one completed and one open paper of each kind. */
function seeded() {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-sweep-"));

  git(root, "init", "--initial-branch=main", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");
  write(root, "src/keep.js", "export const keep = 1;\n");
  write(root, "docs/plans/done.md", "# done plan\n\n- [x] **Step 1**: first.\n");
  write(root, "docs/plans/open.md", "# open plan\n\n- [ ] **Step 1**: first.\n");
  write(root, "docs/reviews/done.md", "# done review\n\n| Finding | Severity | Status |\n| --- | --- | --- |\n| OSS-1 | high | resolved |\n");
  write(root, "docs/audits/done.md", "# done audit\n\n| What | How | Result |\n| --- | --- | --- |\n| X | `ls` | ok |\n");
  write(root, HANDOFF, ["# Handoff 01: a session", "", "**Branch:** `main` - **Date:** 2026-09-17", "", "## Next", "", "- [ ] finish the sweep", ""].join("\n"));
  git(root, "add", "-A");
  git(root, "commit", "-qm", "chore(fixture): the seed");

  return root;
}

test("resuming a session archives the finished papers and names each ADR", () => {
  const root = seeded();

  try {
    const { text } = handon({ projectDir: root });

    assert.match(text, /## Closeout/, "the report carries the section");
    assert.match(text, /docs\/plans\/done\.md.*ADR 00\d/, "the plan is linked to its ADR");
    assert.match(text, /docs\/reviews\/done\.md/, "so is the review");
    assert.match(text, /docs\/audits\/done\.md/, "so is the audit it had a review for");
    assert.equal(existsSync(join(root, "docs/plans/done.md")), false, "the plan leaves the tree");
    assert.equal(existsSync(join(root, "docs/reviews/done.md")), false, "the review leaves the tree");
    assert.equal(existsSync(join(root, "docs/audits/done.md")), false, "the audit leaves the tree");
    assert.equal(existsSync(join(root, "docs/plans/open.md")), true, "open work stays");
    assert.equal(readdirSync(join(root, "docs/adr")).filter((name) => name.endsWith(".md")).length, 4, "three ADRs and the index land");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("closeout false resumes without touching the papers", () => {
  const root = seeded();

  try {
    const { text } = handon({ projectDir: root, closeout: false });

    assert.doesNotMatch(text, /## Closeout/, "no closeout section");
    assert.equal(existsSync(join(root, "docs/plans/done.md")), true, "the plan stays");
    assert.equal(existsSync(join(root, "docs/reviews/done.md")), true, "the review stays");
    assert.equal(adrFiles(root), 0, "no ADR is written");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listing handoffs is still a listing", () => {
  const root = seeded();

  try {
    const { text } = handon({ projectDir: root, list: true });

    assert.match(text, /01-a-session\.md/, "the handoff is listed");
    assert.equal(existsSync(join(root, "docs/plans/done.md")), true, "listing sweeps nothing");
    assert.equal(adrFiles(root), 0, "listing writes no ADR");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
