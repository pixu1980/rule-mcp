

import { strict as assert } from "node:assert";
import test from "node:test";

import { parseReleaseArgv } from "../index.mjs";
import { resolveReleaseVersion, VERSION_SHAPE } from "../_plan.mjs";

test("VERSION_SHAPE accepts a release and a prerelease", () => {
  assert.ok(VERSION_SHAPE.test("0.1.0"));
  assert.ok(VERSION_SHAPE.test("0.1.0-beta"));
  assert.ok(!VERSION_SHAPE.test("v0.1.0"));
  assert.ok(!VERSION_SHAPE.test("1.0"));
});

test("resolveReleaseVersion derives when nothing is forced", () => {
  const derived = resolveReleaseVersion({ bump: "minor", version: "0.2.0", commits: 3 }, null);

  assert.deepEqual(derived, { next: "0.2.0", bump: "minor", commits: 3 });
});

test("resolveReleaseVersion refuses an empty derived bump", () => {
  const derived = resolveReleaseVersion({ bump: "none", version: "0.1.0", commits: 2 }, null);

  assert.equal(derived.next, "");
  assert.match(derived.refusal ?? "", /nothing to release/);
});

test("resolveReleaseVersion forces a valid SemVer", () => {
  const forced = resolveReleaseVersion({ bump: "major", version: "1.0.0", commits: 800 }, "0.1.0");

  assert.deepEqual(forced, { next: "0.1.0", bump: "forced", commits: 800 });
});

test("resolveReleaseVersion refuses a bad force", () => {
  const forced = resolveReleaseVersion({ bump: "minor", version: "0.2.0", commits: 1 }, "v0.1.0");

  assert.equal(forced.next, "");
  assert.match(forced.refusal ?? "", /not a SemVer/);
});

test("parseReleaseArgv reads --version and the dry-run switches", () => {
  assert.deepEqual(parseReleaseArgv(["--dry-run", "--version", "0.1.0", "--no-push", "--no-checks"]), {
    dryRun: true,
    push: false,
    checks: false,
    version: "0.1.0",
  });
  assert.equal(parseReleaseArgv(["--version=0.1.0"]).version, "0.1.0");
});
