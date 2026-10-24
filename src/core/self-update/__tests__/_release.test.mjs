/** @module core/self-update/__tests__/release - tag ordering and releaseState */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { compareVersions, formatVersion, highestVersionTag, parseVersion } from "../_semver.js";
import "../../../../tests/fixtures/git-hermetic.mjs";

test("parseVersion reads plain and v-prefixed triples, and refuses a prerelease", () => {
  assert.deepEqual(parseVersion("1.2.3"), { major: 1, minor: 2, patch: 3 });
  assert.deepEqual(parseVersion("v0.2.0"), { major: 0, minor: 2, patch: 0 });
  assert.equal(parseVersion("0.2.0-rc"), null);
  assert.equal(parseVersion("not-a-version"), null);
});

test("highestVersionTag picks by version, not by text order", () => {
  const best = highestVersionTag(["v1.9.0", "v1.10.0", "v1.2.0"]);

  assert.equal(best.tag, "v1.10.0");
  assert.equal(formatVersion(best.version), "1.10.0");
  assert.ok(compareVersions(best.version, parseVersion("1.9.0")) > 0);
});

test("releaseState reports newer when origin/main carries a higher tag", async () => {
  const remote = mkdtempSync(join(tmpdir(), "rule-mcp-rel-remote-"));
  const git = (cwd, args) => execFileSync("git", ["-c", "init.defaultBranch=main", ...args], { cwd, encoding: "utf8" }).trim();

  git(remote, ["init"]);
  git(remote, ["config", "user.email", "test@example.com"]);
  git(remote, ["config", "user.name", "test"]);
  writeFileSync(join(remote, "package.json"), '{"version":"2.0.0"}\n');
  git(remote, ["add", "package.json"]);
  git(remote, ["commit", "-m", "chore: start"]);
  const first = git(remote, ["rev-parse", "HEAD"]);
  git(remote, ["tag", "-a", "v2.0.0", "-m", "v2.0.0"]);
  writeFileSync(join(remote, "next.txt"), "next\n");
  git(remote, ["add", "next.txt"]);
  git(remote, ["commit", "-m", "feat: next"]);
  git(remote, ["tag", "-a", "v2.1.0", "-m", "v2.1.0"]);

  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-rel-local-"));
  git(dir, ["clone", remote, "."]);
  git(dir, ["checkout", "--detach", first]);
  git(dir, ["checkout", "-B", "main"]);

  const { releaseState } = await import("../_release.js");
  const state = await releaseState(dir);

  assert.equal(state.latest.tag, "v2.1.0");
  assert.equal(state.current, "2.0.0");
  assert.equal(state.newer, true);
});
