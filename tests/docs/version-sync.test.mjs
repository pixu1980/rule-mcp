import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * One version, three places (OSS-21).
 *
 * The version lives in package.json, server.json and the git tag, and
 * nothing verified them - so a release could ship a manifest that
 * disagrees with its tag. scripts/build/version/index.mjs is the single
 * writer (--apply) and the gate (--check); CI and the release workflow
 * call it so the three copies cannot drift.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (file) => readFileSync(join(root, file), "utf8");

function newestChangelogVersion() {
  const headings = [...read("CHANGELOG.md").matchAll(/^## \[(.+?)\]/gmu)].map((match) => match[1]);
  const releases = headings.filter((heading) => heading !== "Unreleased");

  assert.ok(releases.length > 0, "CHANGELOG.md has no release heading");

  return releases[0];
}

test("package.json, server.json and the newest CHANGELOG heading agree", () => {
  const manifest = JSON.parse(read("package.json"));
  const server = JSON.parse(read("server.json"));

  assert.equal(server.version, manifest.version, "server.json must track package.json");
  assert.equal(newestChangelogVersion(), manifest.version, "the newest CHANGELOG heading must track package.json");
});

test("the version script --check exits 0", () => {
  execFileSync(process.execPath, ["scripts/build/version/index.mjs", "--check"], { cwd: root, stdio: "pipe" });
});

test("CI and the release workflow call the version script", () => {
  for (const workflow of [".github/workflows/ci.yml", ".github/workflows/release.yml"]) {
    assert.ok(read(workflow).includes("scripts/build/version/index.mjs"), `${workflow} must call the version gate`);
  }
});

test("the manifest carries the source-link fields", () => {
  const manifest = JSON.parse(read("package.json"));

  assert.equal(manifest.author, "pixu1980", "author must name the copyright holder");
  assert.equal(manifest.repository, "github:pixu1980/rule", "repository must point at the source");
  assert.equal(manifest.bugs?.url, "https://github.com/pixu1980/rule/issues", "bugs must point at the tracker");
  assert.equal(manifest.homepage, "https://github.com/pixu1980/rule", "homepage must point at the repo");
});
