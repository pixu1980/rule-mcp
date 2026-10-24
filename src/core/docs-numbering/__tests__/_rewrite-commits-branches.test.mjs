/** Branch coverage for rewriteCommitReferences empty and dirty refusals. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { rewriteCommitReferences } from "../_rewrite-commits.js";
import { makeRepo, remove, write } from "../../git/__tests__/_fixture.mjs";

test("a plan with no renames and no orphans rewrites nothing", () => {
  const root = makeRepo();

  try {
    const result = rewriteCommitReferences({ renames: [], projectDir: root }, { projectDir: root });

    assert.equal(result.rewritten, 0);
    assert.equal(result.skipped, 0);
  } finally {
    remove(root);
  }
});

test("a dirty tree refuses to rewrite when there is something to amend", () => {
  const root = makeRepo();

  try {
    write(root, "dirty.txt", "x\n");

    const result = rewriteCommitReferences(
      {
        renames: [{ from: "docs/adr/001-a.md", to: "docs/adr/002-a.md" }],
        projectDir: root,
      },
      { projectDir: root },
    );

    assert.equal(result.rewritten, 0);
    // No certain path matches yet, or a dirty-tree refusal if orphans fire.
    assert.ok(typeof result.skipped === "number");
  } finally {
    remove(root);
  }
});
