

/** Closeout: completed audits/reviews/plans fold into ADRs and leave the tree. */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { buildHandoff } from "../_build.js";
import { archiveCompletedDocs, findCompletedDocs } from "../_closeout.js";

const PLAN_DONE = "# done plan\n\n- [x] **Step 1**: first.\n- [x] **1.1**: sub.\n";
const PLAN_OPEN = "# open plan\n\n- [x] **Step 1**: first.\n- [ ] **Step 2**: second.\n";
const REVIEW_DONE = "# done review\n\n| Finding | Severity | Status |\n| --- | --- | --- |\n| OSS-1 | high | resolved |\n";
const REVIEW_OPEN = "# open review\n\n| Finding | Severity | Status |\n| --- | --- | --- |\n| OSS-1 | high | open |\n";
const AUDIT = "# audit\n\n| What | How | Result |\n| --- | --- | --- |\n| X | `ls` | ok |\n";
const AUTHOR = "test <t@t.t>";

/** A project with one done and one open doc per kind, plus an orphan audit. */
function seed() {
  const dir = mkdtempSync(join(tmpdir(), "rule-closeout-"));

  for (const sub of ["audits", "reviews", "plans", "adr"]) {
    mkdirSync(join(dir, "docs", sub), { recursive: true });
  }

  writeFileSync(join(dir, "docs/plans/done.md"), PLAN_DONE);
  writeFileSync(join(dir, "docs/plans/open.md"), PLAN_OPEN);
  writeFileSync(join(dir, "docs/reviews/done.md"), REVIEW_DONE);
  writeFileSync(join(dir, "docs/reviews/open.md"), REVIEW_OPEN);
  writeFileSync(join(dir, "docs/audits/done.md"), AUDIT);
  writeFileSync(join(dir, "docs/audits/orphan.md"), AUDIT);

  return dir;
}

test("only fully completed docs are found, open and orphaned ones are not", () => {
  const dir = seed();
  const found = findCompletedDocs(dir)
    .map((entry) => entry.path)
    .sort();

  assert.deepEqual(found, ["docs/audits/done.md", "docs/plans/done.md", "docs/reviews/done.md"]);
  rmSync(dir, { recursive: true, force: true });
});

test("archive writes one ADR per doc, refreshes the index, deletes sources", () => {
  const dir = seed();
  const { archived, skipped } = archiveCompletedDocs(dir, { author: AUTHOR });

  assert.equal(archived.length, 3, "plan, review and its audit archive");
  assert.deepEqual(skipped, [], "nothing skipped");
  assert.equal(archived[0].adrNumber, 1, "numbering starts at one");

  const body = readFileSync(join(dir, "docs/adr", archived[0].adrFile), "utf8");

  assert.match(body, /^# 001: Close out /m, "the Nygard title records the closeout");
  assert.match(body, /^## Decision$/m, "the template sections render");

  const index = readFileSync(join(dir, "docs/adr/ADR.md"), "utf8");

  assert.match(index, /Close out/, "the index names the new ADR");

  for (const doc of archived) {
    assert.equal(existsSync(join(dir, doc.path)), false, `${doc.path} leaves the tree`);
  }

  assert.equal(existsSync(join(dir, "docs/plans/open.md")), true, "open work stays");
  rmSync(dir, { recursive: true, force: true });
});

test("a non-English doc is skipped and kept on disk", () => {
  const dir = seed();

  writeFileSync(join(dir, "docs/plans/piano.md"), "# piano di lavoro senza eccezioni\n\n- [x] **Passo 1**: fatto tutto.\n");

  const { archived, skipped } = archiveCompletedDocs(dir, { author: AUTHOR });

  assert.equal(archived.length, 3, "the English docs still archive");
  assert.equal(skipped.length, 1, "the Italian plan is reported");
  assert.equal(skipped[0].path, "docs/plans/piano.md");
  assert.match(skipped[0].reason, /English/i, "the reason names the gate");
  assert.equal(existsSync(join(dir, "docs/plans/piano.md")), true, "the file is kept");
  rmSync(dir, { recursive: true, force: true });
});

test("every mode archives and names the ADR", () => {
  const roots = ["close-session", "handoff"].map((mode) => {
    const root = seed();
    const built = buildHandoff({ projectDir: root, mode, maxTokens: 0, format: "full" });

    assert.match(built.text, /### Closeout/, `${mode} carries the section`);
    assert.match(built.text, /docs\/plans\/done\.md.*ADR 00\d/, `${mode} links doc to ADR`);
    assert.equal(built.stats.archived, 3, `${mode} counts the archived docs`);
    assert.equal(existsSync(join(root, "docs/plans/done.md")), false, `${mode} deletes the sources`);
    assert.equal(existsSync(join(root, "docs/plans/open.md")), true, `${mode} keeps open work`);

    return root;
  });

  for (const root of roots) {
    rmSync(root, { recursive: true, force: true });
  }
});

test("closeout false is a read-only diagnosis in every mode", () => {
  for (const mode of ["close-session", "handoff"]) {
    const root = seed();
    const built = buildHandoff({ projectDir: root, mode, closeout: false, maxTokens: 0, format: "full" });

    assert.doesNotMatch(built.text, /### Closeout/, `${mode} renders no closeout section`);
    assert.equal(built.stats.archived, 0, `${mode} archives nothing`);
    assert.equal(existsSync(join(root, "docs/plans/done.md")), true, `${mode} deletes nothing`);
    assert.equal(readdirSync(join(root, "docs/adr")).length, 0, `${mode} writes no ADR`);
    rmSync(root, { recursive: true, force: true });
  }
});
