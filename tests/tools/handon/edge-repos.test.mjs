/** Repositories the verifier must not invent facts about. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, handon, write } from "./_handon.fixture.mjs";

test("no handoff directory is a clear message, not an invented summary", () => {
  const empty = mkdtempSync(join(tmpdir(), "rule-handon-empty-"));
  const result = handon({ projectDir: empty });
  assert.equal(result.source, undefined);
  assert.ok(result.text.includes("No handoff"), "it says there is nothing to resume from");
  assert.equal(result.claims.length, 0);
  rmSync(empty, { recursive: true, force: true });
});

test("a repository with no git history still reports the handoff", () => {
  const bare = mkdtempSync(join(tmpdir(), "rule-handon-nogit-"));
  write(bare, "docs/handoff/01-x.md", "# Handoff 01: x\n\n**Branch:** `main`\n\n- [ ] finish it\n");
  const result = handon({ projectDir: bare });
  assert.equal(result.source, "docs/handoff/01-x.md");
  const branch = result.claims.find((claim) => claim.kind === "branch");
  assert.equal(branch.verdict, "unverified, no git repository");
  rmSync(bare, { recursive: true, force: true });
});

test("a path git never tracked is not reported as deleted", () => {
  // A handoff names `.internal/roles-accepted.json` to explain where an
  // acceptance is recorded. The directory is gitignored, so the file is absent
  // from a fresh clone and calling it deleted invents a fact - the same failure
  // the glob case fixed, from the other direction.
  const root = mkdtempSync(join(tmpdir(), "rule-handon-ignored-"));
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");
  write(root, ".gitignore", ".internal/\n");
  write(root, "src/real.js", "export const real = 1;\n");
  // A real deletion, so the "deleted" verdict has something to be right about.
  write(root, "src/removed.js", "export const removed = 1;\n");
  write(
    root,
    "docs/handoff/01-fixture.md",
    [
      "# Handoff 01: the fixture",
      "",
      "- **Branch**: `main`",
      "- **Date**: 2026-09-04",
      "",
      "The acceptance lands in `.internal/roles-accepted.json`, and the work is in `src/real.js`.",
      "A file that really is gone: `src/removed.js`.",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(handoff): the fixture");
  rmSync(join(root, "src", "removed.js"));
  git(root, "add", "-A");
  git(root, "commit", "-qm", "refactor(src): drop removed.js");

  const report = handon({ projectDir: root });
  const verdictFor = (path) => report.claims.find((claim) => claim.kind === "file" && claim.value === path)?.verdict;

  assert.doesNotMatch(verdictFor(".internal/roles-accepted.json") ?? "", /deleted/, "git never tracked it");
  assert.match(verdictFor(".internal/roles-accepted.json") ?? "", /untracked|ignored|does not track/i, "the verdict says why it cannot be checked");
  assert.equal(verdictFor("src/real.js") !== undefined, true, "a tracked file is still verified");
  assert.match(verdictFor("src/removed.js") ?? "", /deleted/, "and a path git knew about is still reported deleted");
});
