/** handon verify bucketing and the handoff git reads. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { verify } from "../../../src/tools/handon/_verify.js";
import { getGitDiff, getGitLog } from "../../../src/tools/handoff/_git.js";
import { git as gitRun } from "../../../tests/tools/handon/_handon.fixture.mjs";

const git = (cwd, ...args) => gitRun(cwd, ...args);

test("verify consults the repository for branches, ranges and commands", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-verify-"));
  git(root, "init", "--initial-branch=main", "-q");
  git(root, "config", "user.email", "t@t.t");
  git(root, "config", "user.name", "t");
  writeFileSync(join(root, "a.txt"), "a\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "base");
  git(root, "checkout", "-qb", "feat/x");
  writeFileSync(join(root, "b.txt"), "b\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "work");
  git(root, "checkout", "-q", "main");

  const claims = verify(root, {
    branches: ["main", "feat/x", "ghost"],
    ranges: [{ start: "HEAD", end: "HEAD" }],
    commands: ["git status"],
  });

  assert.ok(claims.some((c) => c.kind === "branch" && c.value === "main" && c.bucket === "still-true"), "current branches hold");
  assert.ok(claims.some((c) => c.kind === "branch" && c.value === "ghost" && c.bucket === "changed"), "gone branches change");
  assert.ok(claims.some((c) => c.kind === "range"), "the range is verified");
  assert.ok(claims.some((c) => c.kind === "command"), "the command is verified");
  rmSync(root, { recursive: true, force: true });
});

test("verify answers unverified without a git repository", () => {
  const bare = mkdtempSync(join(tmpdir(), "rule-verify-nogit-"));
  const claims = verify(bare, { branches: ["main"], ranges: [], commands: [] });
  assert.ok(claims.some((c) => c.bucket === "unverified"), "no repo means unverified");
  rmSync(bare, { recursive: true, force: true });
});

test("getGitDiff reports files, staged and unstaged, without a repo", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-gitdiff-"));
  git(root, "init", "-q");
  git(root, "config", "user.email", "t@t.t");
  git(root, "config", "user.name", "t");
  writeFileSync(join(root, "f.txt"), "one\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "seed");
  writeFileSync(join(root, "f.txt"), "two\n");
  writeFileSync(join(root, "new.txt"), "x\n");

  const diff = getGitDiff(root);
  assert.ok(diff.files.includes("f.txt"), "the modified tracked file is listed");
  assert.match(diff.unstaged, /two/, "the unstaged diff carries content");
  assert.match(diff.untracked, /new\.txt/, "untracked files are reported");
  rmSync(root, { recursive: true, force: true });

  const absent = getGitDiff("/tmp/no-such-project");
  assert.deepEqual(absent.files, [], "a missing repo means no files");
  assert.equal(getGitLog("/tmp/no-such-project"), "", "a missing repo means no log");
});