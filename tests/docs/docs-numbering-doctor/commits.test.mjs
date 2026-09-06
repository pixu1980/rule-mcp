/** Commit messages that name renumbered documents: reported, rewritten, or left alone. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  planRenumber,
  applyRenumber,
  rewriteCommitReferences,
  staleCommitReferences,
} from "../../../src/core/docs-numbering/index.js";
import { git, seedRepo } from "./_doctor.fixture.mjs";

test("commit messages that name a renumbered document are reported", () => {
  const root = seedRepo();
  // A commit that refers to the document about to move, the way this project
  // writes them: "ADR 069" in the subject and the path in the body.
  writeFileSync(join(root, "docs/adr/069-personas.md"), "# 069: Personas\n\n- **Status**: accepted\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): accept ADR 069\n\nSee docs/adr/069-personas.md for the decision."], root);

  const plan = planRenumber({ projectDir: root });
  const stale = staleCommitReferences(plan, { projectDir: root });

  assert.ok(stale.length > 0, "the commit naming the moved document has to be reported");
  const hit = stale.find((entry) => entry.subject.includes("accept ADR 069"));
  assert.ok(hit, `expected that commit among ${JSON.stringify(stale.map((e) => e.subject))}`);
  assert.equal(hit.file, "docs/adr/069-personas.md", "the report names the document that moved");
  assert.equal(hit.toNumber, "070", "and the number it moved to");
  assert.match(hit.sha, /^[0-9a-f]{7,40}$/);
  assert.equal(hit.match, "path", "it names the file, so the reference is certainly stale");
});

test("a message naming only the number is reported as ambiguous, not as stale", () => {
  const root = seedRepo();
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): accept ADR 069"], root);

  const stale = staleCommitReferences(planRenumber({ projectDir: root }), { projectDir: root });
  const hit = stale.find((entry) => entry.subject === "docs(adr): accept ADR 069");

  assert.ok(hit, "it still has to be surfaced");
  assert.equal(
    hit.match,
    "number",
    "two documents held 069, so which one the message meant cannot be read from the message",
  );
});

test("a commit that names the document keeping its number is left alone", () => {
  const root = seedRepo();
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): note 068-first.md"], root);

  const plan = planRenumber({ projectDir: root });
  const stale = staleCommitReferences(plan, { projectDir: root });

  assert.equal(
    stale.some((entry) => entry.subject.includes("068-first")),
    false,
    "068 does not move, so no commit about it is stale",
  );
});

test("--fix-commits rewrites the certainly-stale messages and leaves the ambiguous ones", () => {
  const root = seedRepo();
  writeFileSync(join(root, "docs/adr/069-personas.md"), "# 069: Personas\n\n- **Status**: accepted\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): accept docs/adr/069-personas.md"], root);
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): accept ADR 069"], root);

  const plan = planRenumber({ projectDir: root });
  const rewritten = rewriteCommitReferences(plan, { projectDir: root });

  assert.equal(rewritten.rewritten, 1, "one message named the file");
  assert.equal(rewritten.skipped, 1, "the number-only one is left for a human");

  const log = git(["log", "--format=%s%n%b"], root);
  assert.match(log, /070-personas\.md/, "the rewritten message points at the new path");
  assert.match(log, /docs\(adr\): accept ADR 069/, "the ambiguous message is untouched");
});

test("a published commit is never rewritten", () => {
  const root = seedRepo();
  // The message has to name the moved file, or there is nothing to refuse.
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): accept docs/adr/069-personas.md"], root);
  const bare = mkdtempSync(join(tmpdir(), "rule-doctor-remote-"));
  git(["init", "--quiet", "--bare"], bare);
  git(["remote", "add", "origin", bare], root);
  git(["push", "--quiet", "-u", "origin", "main"], root);

  const plan = planRenumber({ projectDir: root });
  const rewritten = rewriteCommitReferences(plan, { projectDir: root });

  assert.equal(rewritten.rewritten, 0, "nothing is rewritten once it is published");
  assert.match(rewritten.refused ?? "", /published|pushed|upstream/i, "and the refusal says why");
});

// ── An index that drifted without any collision ──

/** A repo with unique numbers and an index whose rows are in append order. */

test("--fix-commits repairs a message after the renaming has already happened", () => {
  // The case a second run hits: --fix moved the file, the message still names
  // the old path, and the plan has no renames left to derive it from.
  const root = seedRepo();
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): accept docs/adr/069-personas.md"], root);
  applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });
  // A previous run committed its renames, which is what leaves the messages
  // behind as the only thing still pointing at the old path.
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): renumber"], root);

  const plan = planRenumber({ projectDir: root });
  assert.deepEqual(plan.renames, [], "the numbering is already clean");

  const rewritten = rewriteCommitReferences(plan, { projectDir: root });

  assert.equal(rewritten.rewritten, 1, "the stale path is still repairable from the slug");
  assert.match(git(["log", "--format=%s%n%b"], root), /070-personas\.md/, "and points at the file that exists");
  rmSync(root, { recursive: true, force: true });
});
