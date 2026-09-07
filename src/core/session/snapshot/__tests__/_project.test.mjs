/** snapshotProject and its helpers: walkers, component counting, tokensave. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { snapshotProject } from "../index.js";

const project = mkdtempSync(join(tmpdir(), "rule-proj-"));

test.before(() => {
  mkdirSync(join(project, "src", "Button"), { recursive: true });
  mkdirSync(join(project, "src", "plain"), { recursive: true });
  mkdirSync(join(project, "docs", "adr"), { recursive: true });
  mkdirSync(join(project, "node_modules", "pkg", "deep"), { recursive: true });
  mkdirSync(join(project, "dist"), { recursive: true });
  mkdirSync(join(project, ".tokensave"), { recursive: true });

  writeFileSync(join(project, "src", "Button", "index.js"), "// barrel\n");
  writeFileSync(join(project, "src", "Button", "button.js"), "export const a = 1;\n");
  writeFileSync(join(project, "src", "plain", "lib.js"), "line1\nline2\n");
  writeFileSync(join(project, "src", "plain", "icon.png"), "not source");
  writeFileSync(join(project, "src", "plain", "lib.test.js"), "// test\n");
  writeFileSync(join(project, "docs", "adr", "001-first.md"), "# 001\n");
  writeFileSync(join(project, "docs", "adr", "skip.md"), "# no number\n");
  writeFileSync(join(project, "node_modules", "pkg", "deep", "big.js"), "x".repeat(100));
  writeFileSync(join(project, "dist", "bundle.js"), "y".repeat(50));
  writeFileSync(join(project, ".tokensave", "branch-meta.json"), JSON.stringify({ db_file: "graph.db" }));
  writeFileSync(join(project, ".tokensave", "graph.db"), "tokens");
});

test.after(() => rmSync(project, { recursive: true, force: true }));

test("snapshotProject counts files, lines, components, adrs and tests", () => {
  const snap = snapshotProject(project);

  assert.equal(snap.files.total, 7, "ignored trees are not walked");
  assert.equal(snap.files.byExtension[".js"], 4, "js files are tallied by extension");
  assert.equal(snap.components, 1, "a directory with a barrel is a component");
  assert.equal(snap.adrs, 1, "numbered adr documents count");
  assert.equal(snap.testFiles, 1, "test paths count");
  assert.equal(snap.lines.byExtension[".js"], 5, "line counts accumulate per extension");
  assert.equal(snap.bytes.nodeModules, 100, "node_modules size is measured");
  assert.equal(snap.bytes.dist, 50, "dist size is measured");
});

test("tokensaveStats reports the db file and bytes from the meta", () => {
  const snap = snapshotProject(project);
  assert.equal(snap.tokensave.present, true, "the graph directory exists");
  assert.equal(snap.tokensave.dbFile, "graph.db", "the meta names the db");
  assert.equal(snap.tokensave.dbBytes, 6, "the db size is measured");
});

test("a project without tokensave or installations reports absent zeros", () => {
  const bare = mkdtempSync(join(tmpdir(), "rule-proj-bare-"));
  writeFileSync(join(bare, "a.js"), "x\n");
  const snap = snapshotProject(bare);

  assert.deepEqual(snap.tokensave, { present: false }, "no graph means absent, not zero");
  assert.equal(snap.bytes.nodeModules, 0, "no node_modules means zero");
  assert.equal(snap.bytes.dist, 0, "no dist means zero");
  rmSync(bare, { recursive: true, force: true });
});

test("a plain file that looks like a directory is walked past", () => {
  const weird = mkdtempSync(join(tmpdir(), "rule-proj-weird-"));
  writeFileSync(join(weird, "blocker"), "a file, not a dir", "utf8");
  mkdirSync(join(weird, "sub", "barrels"), { recursive: true });
  writeFileSync(join(weird, "sub", "barrels", "index.js"), "//\n");

  const snap = snapshotProject(weird);
  assert.equal(snap.components, 1, "the barrel under sub counts");
  assert.ok(snap.files.total >= 2, "the blocker and the barrel files count");
  rmSync(weird, { recursive: true, force: true });
});
