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