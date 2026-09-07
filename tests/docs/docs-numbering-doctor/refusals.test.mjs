/** rewriteCommitReferences refusals: a dirty tree never rewrites history. */
import { strict as assert } from "node:assert";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { planRenumber, rewriteCommitReferences } from "../../../src/core/docs-numbering/index.js";
import { git, seedRepo } from "./_doctor.fixture.mjs";

test("uncommitted changes block the rewrite with a reason", () => {
  const root = seedRepo();
  writeFileSync(join(root, "docs/adr/069-personas.md"), "# 069: Personas\n\n- **Status**: accepted\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): accept docs/adr/069-personas.md"], root);

  const plan = planRenumber({ projectDir: root });
  writeFileSync(join(root, "stray.txt"), "uncommitted", "utf8");

  const result = rewriteCommitReferences(plan, { projectDir: root });

  assert.equal(result.rewritten, 0, "nothing is rewritten");
  assert.match(result.refused ?? "", /uncommitted/, "the refusal names the dirty tree");
  rmSync(root, { recursive: true, force: true });
});

test("rewriteCommitReferences defaults the project to the plan's own directory", () => {
  const root = seedRepo();
  writeFileSync(join(root, "docs/adr/069-personas.md"), "# 069: Personas\n\n- **Status**: accepted\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): accept docs/adr/069-personas.md"], root);

  const plan = planRenumber({ projectDir: root });
  const rewritten = rewriteCommitReferences(plan);

  assert.equal(rewritten.rewritten, 1, "the plan carries the directory");
  rmSync(root, { recursive: true, force: true });
});
test("a plan without renames repairs orphaned path references without an upstream", async () => {
  const { seedScrambledIndex, git } = await import("./_doctor.fixture.mjs");
  const root = seedScrambledIndex();
  writeFileSync(join(root, "docs/adr/081-temp-name.md"), "# 081: Temp\n\n- **Status**: accepted\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): decide docs/adr/081-temp-name.md"], root);
  rmSync(join(root, "docs/adr/081-temp-name.md"), { force: true });
  writeFileSync(join(root, "docs/adr/079-temp-name.md"), "# 079: Temp\n\n- **Status**: accepted\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): rename to docs/adr/079-temp-name.md"], root);

  const rewritten = rewriteCommitReferences({}, { projectDir: root });

  assert.equal(rewritten.rewritten, 1, "the orphaned path is repaired from its slug");
  assert.match(git(["log", "--format=%s%n%b"], root), /079-temp-name\.md/, "the rewritten message names the survivor");
  rmSync(root, { recursive: true, force: true });
});
