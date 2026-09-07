/** The plan reporter: clean, unordered, authors and stale-commit variants. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { renderRenumberPlan } from "../../../src/core/docs-numbering/index.js";
import { planRenumber } from "../../../src/core/docs-numbering/index.js";
import { seedRepo, git } from "./_doctor.fixture.mjs";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

test("a clean plan says so, with or without authors", () => {
  const plain = renderRenumberPlan({ renames: [], indexUnordered: false, authors: [] }, {});
  assert.match(plain, /Numbering is clean/, "a clean plan reports it");

  const withAuthors = renderRenumberPlan(
    { renames: [], indexUnordered: false, authors: [{ file: "docs/adr/001-x.md", current: "no author line", author: "me" }] },
    { fix: true },
  );
  assert.match(withAuthors, /1 ADR\(s\) name a tool or nobody/, "the author count renders");
  assert.doesNotMatch(withAuthors, /Run with --fix to name/, "with fix the hint goes away");
});

test("an out-of-order index without collisions says so", () => {
  const out = renderRenumberPlan({ renames: [], indexUnordered: true, authors: [] }, {});
  assert.match(out, /out of order/, "the disorder is reported");
  assert.match(out, /Run with --fix to regenerate/, "the fix hint appears when not fixing");
});

test("a plan with renames lists them and the stale commits below", () => {
  const root = seedRepo();
  writeFileSync(join(root, "docs/adr/069-personas.md"), "# 069: Personas\n\n- **Status**: accepted\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): accept docs/adr/069-personas.md"], root);

  const plan = planRenumber({ projectDir: root });
  assert.ok(plan.renames.length > 0, "the fixture produces renames");

  const out = renderRenumberPlan(plan, {});
  assert.match(out, /collision\(s\) found/, "the collision count renders");
  assert.match(out, /069-personas\.md -> .*070-personas\.md/, "the rename renders");
  assert.match(out, /commit message\(s\) touch a document that moves/, "the stale-commit note renders");
  assert.match(out, /certainly stale/, "the certainly-stale list follows");

  const concise = renderRenumberPlan(plan, { fix: true });
  assert.doesNotMatch(concise, /Run with --fix to apply/, "the fix hint goes away when fixing");
  rmSync(root, { recursive: true, force: true });
});