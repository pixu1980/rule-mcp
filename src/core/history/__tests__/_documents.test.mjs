

/** ADR 128 - the close squash consolidates the feature's ADRs and handoffs. */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { applySquash, featureSlug, planConsolidation } from "../index.js";
import { makeRepo, remove, run, write } from "../../git/__tests__/_fixture.mjs";

/** Write a file and commit it, creating its directory. */
function writeCommit(root, file, body, message) {
  write(root, file, body);
  run(root, "add", "-A");
  run(root, "commit", "-q", "-m", message);
}

/** A feature branch carrying two ADRs and two session handoffs. */
function featureWithDocuments() {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/git-workflow");
  writeCommit(root, "src/a.js", "a\n", "feat(git): the feature");
  writeCommit(root, "docs/adr/124-first.md", "# 124: First decision\n\n## Decision\n\nOne.\n", "docs(adr): record 124");
  writeCommit(root, "docs/adr/125-second.md", "# 125: Second decision\n\n## Decision\n\nTwo.\n", "docs(adr): record 125");
  writeCommit(
    root,
    "docs/handoff/20-first.md",
    "# Session handoff 20 - first\n\n- **Branch**: `feat/git-workflow`\n- **Date**: 2026-01-01\n\nSession one.\n",
    "chore(handoff): add 20-first",
  );
  writeCommit(
    root,
    "docs/handoff/21-second.md",
    "# Session handoff 21 - second\n\n- **Branch**: `feat/git-workflow`\n- **Date**: 2026-01-02\n\nSession two.\n",
    "chore(handoff): add 21-second",
  );

  return root;
}

test("the slug comes from the branch", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/git-workflow");

  assert.equal(featureSlug(root), "git-workflow", "the branch tail is the slug");
  remove(root);
});

test("the plan merges the feature's own ADRs and handoffs", () => {
  const root = featureWithDocuments();
  const plan = planConsolidation(root);

  assert.deepEqual(plan.adrs, ["docs/adr/124-first.md", "docs/adr/125-second.md"], "both ADRs are the feature's");
  assert.deepEqual(plan.handoffs, ["docs/handoff/20-first.md", "docs/handoff/21-second.md"], "and both handoffs");
  assert.equal(plan.consolidates.adrs, true, "two ADRs are merged");
  assert.equal(plan.consolidates.handoffs, true, "two handoffs are merged");
  assert.equal(plan.adrTarget, "docs/adr/124-git-workflow.md", "the merged ADR keeps the lowest number and the slug");
  assert.equal(plan.handoffTarget, "docs/handoff/20-git-workflow.md", "and so does the merged handoff");
  assert.equal(plan.actionable, true, "there is something to consolidate");
  remove(root);
});

test("a confirmed squash folds the documents into the one commit", () => {
  const root = featureWithDocuments();

  const result = applySquash(root, { message: "feat(git-workflow): the whole feature", confirm: true });

  assert.equal(result.applied, true, "the squash ran");
  assert.equal(result.verification.commits, 1, "one commit is left");
  assert.equal(result.verification.documentsConsolidated, true, "the documents were consolidated");
  assert.deepEqual(result.verification.unexpected, [], "nothing outside the plan changed");
  assert.ok(result.verification.changed.includes("docs/adr/124-git-workflow.md"), "the merged ADR is in the commit");
  assert.ok(result.verification.changed.includes("docs/adr/125-second.md"), "and the retired ADR is its deletion");

  const mergedAdr = readFileSync(join(root, "docs/adr/124-git-workflow.md"), "utf8");

  assert.match(mergedAdr, /# 124: First decision/u, "the first decision is reproduced");
  assert.match(mergedAdr, /# 125: Second decision/u, "and the second, verbatim");
  assert.equal(existsSync(join(root, "docs/adr/125-second.md")), false, "the original is retired");

  const mergedHandoff = readFileSync(join(root, "docs/handoff/20-git-workflow.md"), "utf8");

  assert.match(mergedHandoff, /Session one\./u, "the first session is reproduced");
  assert.match(mergedHandoff, /Session two\./u, "and the second");
  assert.equal(existsSync(join(root, "docs/handoff/21-second.md")), false, "the original is retired");

  assert.match(readFileSync(join(root, "docs/adr/ADR.md"), "utf8"), /124-git-workflow\.md/u, "the ADR index points at the merged file");
  assert.match(readFileSync(join(root, "docs/handoff/HANDOFF.md"), "utf8"), /20-git-workflow\.md/u, "and so does the handoff index");
  remove(root);
});

test("a merged document preserves an original already named after the feature", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/git-workflow");
  writeCommit(root, "docs/adr/124-git-workflow.md", "# 124: Original decision\n\n## Decision\n\nPreserve the original.\n", "docs(adr): record first");
  writeCommit(root, "docs/adr/125-next.md", "# 125: Next decision\n\n## Decision\n\nPreserve the next.\n", "docs(adr): record next");
  writeCommit(root, "docs/handoff/20-git-workflow.md", "# Session handoff 20\n\nOriginal handoff text.\n", "chore(handoff): record first");
  writeCommit(root, "docs/handoff/21-next.md", "# Session handoff 21\n\nNext handoff text.\n", "chore(handoff): record next");

  const result = applySquash(root, { message: "feat(git-workflow): finish feature", confirm: true });

  assert.equal(result.applied, true);
  assert.match(readFileSync(join(root, "docs/adr/124-git-workflow.md"), "utf8"), /Preserve the original\./u);
  assert.match(readFileSync(join(root, "docs/adr/124-git-workflow.md"), "utf8"), /Preserve the next\./u);
  assert.match(readFileSync(join(root, "docs/handoff/20-git-workflow.md"), "utf8"), /Original handoff text\./u);
  assert.match(readFileSync(join(root, "docs/handoff/20-git-workflow.md"), "utf8"), /Next handoff text\./u);
  remove(root);
});

test("a document cited but committed outside the range is left untouched", () => {
  const root = makeRepo();
  const shared = 200;

  writeCommit(root, "docs/adr/200-shared.md", "# 200: Shared decision\n\n## Decision\n\nShared.\n", "docs(adr): record a shared decision");

  run(root, "checkout", "-q", "-b", "feat/git-workflow");
  writeCommit(root, "src/a.js", "a\n", `feat(git): follow ADR ${shared}`);
  writeCommit(root, "docs/adr/124-first.md", "# 124: First\n\n## Decision\n\nOne.\n", "docs(adr): record 124");
  writeCommit(root, "docs/adr/125-second.md", "# 125: Second\n\n## Decision\n\nTwo.\n", "docs(adr): record 125");

  const plan = planConsolidation(root);

  assert.deepEqual(plan.outside, ["docs/adr/200-shared.md"], "the cited out-of-range ADR is reported, not merged");
  assert.equal(plan.adrs.includes("docs/adr/200-shared.md"), false, "and is not one of the feature's own");

  const result = applySquash(root, { message: "feat(git): the whole feature", confirm: true });

  assert.equal(result.applied, true, "the squash ran");
  assert.equal(existsSync(join(root, "docs/adr/200-shared.md")), true, "the shared ADR is still there");
  assert.equal(result.verification.unexpected.includes("docs/adr/200-shared.md"), false, "and was never planned to change");
  remove(root);
});

test("a single document is not merged, only carried into the commit", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/git-workflow");
  writeCommit(root, "src/a.js", "a\n", "feat(git): the feature");
  writeCommit(root, "docs/adr/124-only.md", "# 124: Only\n\n## Decision\n\nOne.\n", "docs(adr): record 124");

  const plan = planConsolidation(root);

  assert.equal(plan.consolidates.adrs, false, "one ADR is nothing to merge");
  assert.equal(plan.actionable, false, "so there is no consolidation");
  assert.equal(existsSync(join(root, "docs/adr/124-only.md")), true, "and the file stays where it is");
  remove(root);
});
