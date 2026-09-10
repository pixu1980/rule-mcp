import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The release pipeline must ship a verifiable artifact (OSS-11).
 *
 * The release workflow published nothing but a changelog excerpt: no
 * build, no artifact, no checksum. The project actually ships the GitHub
 * tarball, so the pipeline builds it, checksums it, installs it from
 * scratch to prove it works, and only then attaches it - never touching
 * a registry, which is out of scope by decision.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const release = readFileSync(join(root, ".github", "workflows", "release.yml"), "utf8");

test("a build job packs the tarball and checksums it", () => {
  assert.ok(/^ {2}build:/mu.test(release), "release.yml needs a build job");
  assert.ok(release.includes("pnpm build"), "the build job packs through pnpm build");
  // shasum and sha256sum write the same manifest format; CI uses whichever
  // the runner guarantees.
  assert.ok(/shasum|sha256sum/.test(release) && release.includes("SHA256SUMS"), "the build job produces a checksum manifest");
});

test("a verify job installs the packed tarball from scratch", () => {
  assert.ok(/^ {2}verify:/mu.test(release), "release.yml needs a verify job");
  assert.ok(release.includes("download-artifact"), "verify consumes the build artifact, not the checkout");
});

test("the release job ships the build artifact, not a rebuild", () => {
  assert.ok(/^ {2}release:/mu.test(release), "release.yml needs a release job");
  assert.ok(release.includes("softprops/action-gh-release"), "the release job publishes the GitHub Release");
});

test("only the release job holds contents:write", () => {
  for (const name of ["build", "verify", "release"]) {
    const at = release.search(new RegExp(`^ {2}${name}:$`, "mu"));

    assert.ok(at !== -1, `expected a ${name} job`);

    const tail = release.slice(at);
    const next = tail.slice(1).search(/^ {2}\w/mu);
    const block = next === -1 ? tail : tail.slice(0, next + 1);
    const permissions = block.slice(0, block.indexOf("steps:"));

    if (name === "release") {
      assert.ok(/contents:\s*write/.test(permissions), "the release job needs contents:write to publish");
    } else {
      assert.ok(!/contents:\s*write/.test(permissions), `the ${name} job must not hold contents:write`);
    }
  }
});

test("the pipeline never touches a registry", () => {
  for (const needle of ["npm publish", "registry.npmjs.org", "npmjs.com"]) {
    assert.ok(!release.includes(needle), `release.yml must not reference a registry (${needle})`);
  }
});
