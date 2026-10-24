/** WS8 - the next semantic version, derived from the commits since the last tag. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { bumpForCommit, deriveBump, deriveNextVersion, nextVersion } from "../_derive.mjs";

/** A scripted repository with one release tag and unreleased work on top. */
function repository(messages) {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-derive-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

  git("init", "--initial-branch=main", "-q");
  git("config", "user.email", "fixture@example.com");
  git("config", "user.name", "Fixture");

  const commit = (message) => {
    writeFileSync(join(root, "file.txt"), `${message}\n`);
    git("add", "-A");
    git("commit", "-qm", message);
  };

  commit("chore(repo): seed");
  git("tag", "v1.0.0");

  for (const message of messages) {
    commit(message);
  }

  return { root, git };
}

test("a commit's type maps to its bump", () => {
  assert.equal(bumpForCommit({ subject: "feat(api): add a route" }), "minor", "a feature is a minor");
  assert.equal(bumpForCommit({ subject: "fix(api): correct a route" }), "patch", "a fix is a patch");
  assert.equal(bumpForCommit({ subject: "docs(adr): record it" }), "none", "documentation does not bump");
  assert.equal(bumpForCommit({ subject: "no type at all" }), "none", "a non-conforming subject does not bump");
  assert.equal(bumpForCommit({ subject: "feat(api)!: replace the API" }), "major", "the bang is breaking");
  assert.equal(bumpForCommit({ subject: "docs(api): rewrite", body: "BREAKING CHANGE: the page moved" }), "major", "the footer is breaking");
});

test("the strongest bump wins and the deciding commits are named", () => {
  const { bump, reasons } = deriveBump([
    { hash: "aaa1111", subject: "fix(a): small" },
    { hash: "bbb2222", subject: "feat(b): feature" },
    { hash: "ccc3333", subject: "feat(c)!: breaking" },
    { hash: "ddd4444", subject: "test(d): no bump" },
  ]);

  assert.equal(bump, "major", "a breaking change outranks a feature");
  assert.deepEqual(
    reasons.map((reason) => reason.split(" ", 1)[0]),
    ["aaa1111", "bbb2222", "ccc3333"],
    "the bumping commits are named, the silent one is dropped",
  );
});

test("nextVersion applies the bump and drops a prerelease", () => {
  assert.equal(nextVersion("1.2.3", "major"), "2.0.0", "major resets minor and patch");
  assert.equal(nextVersion("1.2.3", "minor"), "1.3.0", "minor resets patch");
  assert.equal(nextVersion("1.2.3", "patch"), "1.2.4", "patch moves the last number");
  assert.equal(nextVersion("1.2.3", "none"), "1.2.3", "no bump keeps the version");
  assert.equal(nextVersion("1.2.3-rc.1", "patch"), "1.2.4", "a prerelease is dropped");
  assert.equal(nextVersion("not-a-version", "patch"), "not-a-version", "an unparseable version is left alone");
});

test("deriveNextVersion reads the commits since the newest tag", () => {
  const { root } = repository(["feat(x): a feature", "fix(y): a fix", "docs(z): notes"]);

  const derived = deriveNextVersion(root, "1.0.0");

  assert.equal(derived.bump, "minor", "the feature decides the bump");
  assert.equal(derived.version, "1.1.0", "the version is derived");
  assert.equal(derived.commits, 3, "every unreleased commit is counted");

  rmSync(root, { recursive: true, force: true });
});

test("a breaking commit since the tag bumps the major", () => {
  const { root } = repository(["fix(x)!: change the contract"]);

  assert.equal(deriveNextVersion(root, "1.4.2").version, "2.0.0", "a breaking fix is a major");

  rmSync(root, { recursive: true, force: true });
});

test("no bumping commit keeps the current version", () => {
  const { root } = repository(["chore(deps): bump a dependency", "test(x): pin a case"]);

  const derived = deriveNextVersion(root, "1.0.0");

  assert.equal(derived.bump, "none", "nothing calls for a bump");
  assert.equal(derived.version, "1.0.0", "so the version does not move");

  rmSync(root, { recursive: true, force: true });
});
