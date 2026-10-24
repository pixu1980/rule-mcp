/** WS7 - the changelog --check gate detects drift from a fresh generation. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { checkChangelog, writeChangelog } from "../index.mjs";

test("checkChangelog reports drift, then agrees after a generation", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-changelog-check-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

  git("init", "--initial-branch=main", "-q");
  git("config", "user.email", "fixture@example.com");
  git("config", "user.name", "Fixture");

  const commit = (message) => {
    writeFileSync(join(root, "file.txt"), `${message}\n`);
    git("add", "-A");
    git("commit", "-qm", message);
  };

  commit("feat(a): add a");
  git("tag", "v1.0.0");
  commit("fix(b): correct b");

  assert.equal(checkChangelog({ projectDir: root }), false, "no CHANGELOG.md yet is drift");
  assert.equal(writeChangelog({ projectDir: root }), true, "the generator writes the file");
  assert.equal(checkChangelog({ projectDir: root }), true, "and it is then current");
  assert.match(readFileSync(join(root, "CHANGELOG.md"), "utf8"), /## \[Unreleased\]/u, "the untagged work is unreleased");
  assert.match(readFileSync(join(root, "CHANGELOG.md"), "utf8"), /## \[1\.0\.0\]/u, "the tag is a release heading");

  writeFileSync(join(root, "CHANGELOG.md"), `${readFileSync(join(root, "CHANGELOG.md"), "utf8")}- a hand edit\n`);

  assert.equal(checkChangelog({ projectDir: root }), false, "a hand edit is drift");

  rmSync(root, { recursive: true, force: true });
});
