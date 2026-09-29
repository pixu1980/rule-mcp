

/** WS7.1 - /rule-init reports the release tooling a project already has. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { detectReleaseTooling, releaseToolingLabels } from "../index.js";

test("a project with nothing reports nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-release-"));
  const tooling = detectReleaseTooling(root);

  assert.deepEqual(
    tooling,
    { changelog: false, changelogScript: false, versionScript: false, releaseWorkflow: false, packageVersioning: false },
    "an empty directory has no release tooling",
  );
  assert.deepEqual(releaseToolingLabels(tooling), [], "and says so with no labels");
  rmSync(root, { recursive: true, force: true });
});

test("a project's own release tooling is detected", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-release-"));

  mkdirSync(join(root, ".github", "workflows"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "x", version: "1.2.3", scripts: { changelog: "x", version: "y" } }));
  writeFileSync(join(root, "CHANGELOG.md"), "# Changelog\n");
  writeFileSync(join(root, ".github", "workflows", "release.yml"), "name: release\n");

  const tooling = detectReleaseTooling(root);

  assert.equal(tooling.changelog, true, "the changelog file is found");
  assert.equal(tooling.changelogScript, true, "the script is found");
  assert.equal(tooling.versionScript, true, "the version script is found");
  assert.equal(tooling.releaseWorkflow, true, "the release workflow is found");
  assert.equal(tooling.packageVersioning, true, "the package version is found");
  assert.deepEqual(
    releaseToolingLabels(tooling).sort(),
    ["changelog", "changelogScript", "packageVersioning", "releaseWorkflow", "versionScript"],
    "every found tooling is labelled",
  );
  rmSync(root, { recursive: true, force: true });
});
