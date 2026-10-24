/** Directory weights and the tokensave stats, over throwaway trees. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { directorySize, tokensaveStats } from "../_sizes.js";

const root = mkdtempSync(join(tmpdir(), "rule-mcp-sizes-"));

test.after(() => rmSync(root, { recursive: true, force: true }));

test("directorySize walks nested trees and weighs a missing dir as zero", () => {
  const tree = join(root, "tree");
  mkdirSync(join(tree, "nested"), { recursive: true });
  writeFileSync(join(tree, "a.txt"), "12345");
  writeFileSync(join(tree, "nested", "b.txt"), "123");

  assert.equal(directorySize(tree), 8, "file sizes sum across nesting");
  assert.equal(directorySize(join(root, "gone")), 0, "a missing dir weighs nothing");
});

test("tokensaveStats distinguishes an absent graph from an empty one", () => {
  assert.deepEqual(tokensaveStats(root), { present: false }, "no .tokensave means absent, not zero");

  const project = join(root, "graphed");
  mkdirSync(join(project, ".tokensave"), { recursive: true });
  const bare = tokensaveStats(project);
  assert.equal(bare.present, true, "the dir alone means present");
  assert.equal(bare.dbFile, "tokensave.db", "the default db name is assumed");
  assert.equal(bare.dbBytes, 0, "a missing db weighs nothing");

  writeFileSync(join(project, ".tokensave", "branch-meta.json"), JSON.stringify({ db_file: "branch.db" }));
  writeFileSync(join(project, ".tokensave", "branch.db"), "0123456789");
  const named = tokensaveStats(project);
  assert.equal(named.dbFile, "branch.db", "branch-meta names the db");
  assert.equal(named.dbBytes, 10, "the named db is weighed");

  writeFileSync(join(project, ".tokensave", "branch-meta.json"), "{broken");
  assert.equal(tokensaveStats(project).dbFile, "tokensave.db", "an unreadable meta falls back to the default name");
});
