

/** Branch coverage for reword: proposals, refusals and the applied path. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { applyReword, proposeReword } from "../index.js";
import { commit, makeRepo, remove, run } from "../../git/__tests__/_fixture.mjs";
import { git } from "../../git/index.js";

function feature() {
  const root = makeRepo();
  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): first");
  return root;
}

test("proposeReword marks entries outside the range and invalid messages", () => {
  const root = feature();
  try {
    const proposal = proposeReword(root, {
      rewrites: [
        { sha: "deadbee", message: "feat(x): ok" },
        { sha: "deadbee", message: "bad" },
      ],
    });

    assert.equal(proposal.entries.length, 2);
    assert.equal(proposal.entries[0].inRange, false);
    assert.equal(proposal.entries[1].valid, false);
  } finally {
    remove(root);
  }
});

test("applyReword refuses without confirmation, rewrites, or a valid entry", () => {
  const root = feature();
  try {
    assert.equal(applyReword(root).reason, "confirmation required");
    assert.equal(applyReword(root, { confirm: true }).reason, "no rewrites requested");
    assert.match(applyReword(root, { confirm: true, rewrites: [{ sha: "deadbee", message: "feat(x): ok" }] }).reason, /invalid or outside/u);
  } finally {
    remove(root);
  }
});

test("applyReword refuses a detached HEAD and a dirty tree", () => {
  const root = feature();
  try {
    const sha = git(root, ["rev-parse", "HEAD"]);
    run(root, "checkout", "-q", "--detach");
    assert.match(applyReword(root, { confirm: true, rewrites: [{ sha, message: "feat(x): reworded" }] }).reason, /detached HEAD/u);
    run(root, "checkout", "-q", "feat/x");
    writeFileSync(join(root, "a.txt"), "changed\n");
    assert.match(applyReword(root, { confirm: true, rewrites: [{ sha, message: "feat(x): reworded" }] }).reason, /working tree not safe/u);
  } finally {
    remove(root);
  }
});

test("applyReword applies a valid rewrite", () => {
  const root = feature();
  try {
    const sha = git(root, ["rev-parse", "HEAD"]);
    const result = applyReword(root, { confirm: true, rewrites: [{ sha, message: "feat(x): reworded" }] });

    assert.equal(result.applied, true);
    assert.equal(result.verification.treeUnchanged, true);
  } finally {
    remove(root);
  }
});
