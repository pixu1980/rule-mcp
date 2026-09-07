/** handon verification: branch and ADR claims against a real scratch repo. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { lines, runs } from "../../../src/tools/handon/_report.js";
import { isAncestor, verifyAdr, verifyBranch } from "../../../src/tools/handon/_verify-refs.js";

const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

test("runs collapses consecutive ids and keeps the gaps apart", () => {
  assert.equal(runs(["001", "002", "003", "007"]), "001 to 003, 007", "ranges and singletons");
  assert.equal(runs(["001"]), "001", "a single id stays alone");
  assert.equal(runs([]), "", "an empty list is empty");
});

test("lines groups files and adrs by verdict and renders the other kinds", () => {
  const claims = [
    { kind: "file", verdict: "exists", value: "a.js", bucket: "checked" },
    { kind: "file", verdict: "exists", value: "b.js", bucket: "checked" },
    { kind: "adr", verdict: "landed", value: "001", bucket: "checked" },
    { kind: "adr", verdict: "landed", value: "002", bucket: "checked" },
    { kind: "branch", verdict: "merged", value: "feat/x", bucket: "checked" },
    { kind: "range", verdict: "2 commits since a1b2c3d", bucket: "checked" },
    { kind: "command", verdict: "ok", value: "pnpm test", bucket: "checked" },
    { kind: "open", verdict: "value in a claim", value: "the index", bucket: "checked" },
    { kind: "mystery", verdict: "ignored", value: "?", bucket: "checked" },
  ];

  const out = lines(claims, "checked");
  assert.ok(
    out.some((line) => line.includes("exists: `a.js`, `b.js`")),
    "files group by verdict",
  );
  assert.ok(
    out.some((line) => line.includes("ADRs 001, 002: landed")),
    "adrs group and pluralize",
  );
  assert.ok(
    out.some((line) => line.includes("branch `feat/x`")),
    "branch lines render",
  );
  assert.ok(
    out.some((line) => line.includes("2 commits")),
    "range lines render",
  );
  assert.ok(
    out.some((line) => line.includes("`pnpm test`")),
    "command lines render",
  );
  assert.ok(
    out.some((line) => line.includes("open: the index")),
    "open lines render",
  );
});

test("verifyBranch reads the checkout, the trunks and the merges", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-"));
  git(["init", "--quiet", "--initial-branch=main"], root);
  git(["config", "user.email", "t@t.t"], root);
  git(["config", "user.name", "t"], root);
  writeFileSync(join(root, "f.txt"), "x\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "base"], root);
  git(["checkout", "--quiet", "-b", "feature"], root);
  writeFileSync(join(root, "f.txt"), "y\n");
  git(["commit", "--quiet", "-am", "feature work"], root);
  git(["checkout", "--quiet", "main"], root);

  assert.equal(verifyBranch(root, "main", "main"), "current", "the checked out branch is current");
  assert.equal(verifyBranch(root, "feature", "main"), "exists, not checked out", "an unmerged branch exists");
  assert.equal(verifyBranch(root, "ghost", "main"), "gone", "a missing branch is gone");

  git(["merge", "--quiet", "--no-ff", "feature"], root);
  assert.match(verifyBranch(root, "feature", "main"), /merged into main/, "a merged branch names the trunk");
  rmSync(root, { recursive: true, force: true });
});

test("isAncestor answers by exit code", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-anc-"));
  git(["init", "--quiet", "--initial-branch=main"], root);
  git(["config", "user.email", "t@t.t"], root);
  git(["config", "user.name", "t"], root);
  writeFileSync(join(root, "a.txt"), "a\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "a"], root);
  const first = git(["rev-parse", "HEAD"], root);
  writeFileSync(join(root, "b.txt"), "b\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "b"], root);
  const second = git(["rev-parse", "HEAD"], root);

  assert.equal(isAncestor(root, first, second), true, "the first commit leads to the second");
  assert.equal(isAncestor(root, second, first), false, "the reverse is not an ancestor");
  rmSync(root, { recursive: true, force: true });
});

test("verifyAdr reads the status from the numbered file", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-adr-"));
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "docs", "adr", "001-first.md"), "# 001\n\n- **Status**: proposed\n");
  writeFileSync(join(root, "docs", "adr", "002-second.md"), "# 002\n\n- **Status**: accepted\n");
  writeFileSync(join(root, "docs", "adr", "003-odd.md"), "# 003\n\nNo status line here\n");

  assert.equal(verifyAdr(root, "001"), "still proposed", "a proposed adr reports its limbo");
  assert.equal(verifyAdr(root, "002"), "accepted", "an accepted adr reports its status");
  assert.equal(verifyAdr(root, "003"), "unverified, no status line", "a missing status line is reported");
  assert.equal(verifyAdr(root, "999"), "not written", "an absent number is not written");
  rmSync(root, { recursive: true, force: true });
});
