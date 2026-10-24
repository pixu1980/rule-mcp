

/** Branch coverage for the pre-rewrite safety gate. */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { rewriteSafety } from "../_worktree.js";
import { makeRepo, remove, run, write } from "./_fixture.mjs";

test("a directory that is not a repository is refused", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-worktree-branches-"));

  assert.deepEqual(rewriteSafety(root).reasons, ["not a git repository"]);
});

test("every unfinished operation is named", () => {
  const root = makeRepo();

  try {
    for (const marker of ["rebase-merge", "CHERRY_PICK_HEAD", "REVERT_HEAD", "BISECT_LOG"]) {
      writeFileSync(join(root, ".git", marker), "x\n");
    }

    const reasons = rewriteSafety(root).reasons.join(" | ");

    assert.match(reasons, /rebase is in progress/u);
    assert.match(reasons, /cherry-pick is in progress/u);
    assert.match(reasons, /revert is in progress/u);
    assert.match(reasons, /bisect is in progress/u);
  } finally {
    remove(root);
  }
});

test("staged and unstaged changes are counted, untracked ones do not block", () => {
  const root = makeRepo();

  try {
    write(root, "new.txt", "x\n");
    assert.equal(rewriteSafety(root).safe, true, "an untracked file does not block");

    run(root, "add", "new.txt");
    assert.match(rewriteSafety(root).reasons.join(" | "), /staged change/u);

    write(root, "seed.txt", "changed\n");
    assert.match(rewriteSafety(root).reasons.join(" | "), /unstaged change/u);
  } finally {
    remove(root);
  }
});
