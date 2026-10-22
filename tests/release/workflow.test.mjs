import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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

test("the release job verifies the cryptographic tag signature against the committed key (OSS-01)", () => {
  const at = release.search(/^ {2}release:$/mu);
  const block = release.slice(at);
  const keyFile = join(root, ".github", "release-signing-key.asc");

  assert.ok(existsSync(keyFile), ".github/release-signing-key.asc must exist in the repository");
  assert.ok(block.includes(".github/release-signing-key.asc"), "release.yml must import .github/release-signing-key.asc");
  assert.ok(block.includes("git verify-tag"), "release.yml must run git verify-tag to verify the cryptographic signature");
});

test("a GPG-signed test tag passes verification and an unsigned annotated tag fails (OSS-01)", () => {
  const keyFile = join(root, ".github", "release-signing-key.asc");

  assert.ok(existsSync(keyFile), ".github/release-signing-key.asc must exist before testing tag verification");

  const repoDir = mkdtempSync(join(tmpdir(), "rule-release-tag-repo-"));
  const signHome = mkdtempSync(join(tmpdir(), "rule-release-gpg-sign-"));
  const verifyHome = mkdtempSync(join(tmpdir(), "rule-release-gpg-verify-"));
  const run = (cmd, args, home) => execFileSync(cmd, args, { cwd: repoDir, env: home ? { ...process.env, GNUPGHOME: home } : process.env, encoding: "utf8", stdio: "pipe" });

  try {
    run("gpg", ["--batch", "--import", keyFile], verifyHome);
    assert.match(run("gpg", ["--list-keys", "--with-colons"], verifyHome), /pisuemiliano\.1980@gmail/u);

    run("gpg", ["--batch", "--passphrase", "", "--quick-gen-key", "Release Test <release-test@example.org>", "ed25519", "default", "0"], signHome);
    const pub = execFileSync("gpg", ["--armor", "--export", "release-test@example.org"], { cwd: repoDir, env: { ...process.env, GNUPGHOME: signHome } });

    execFileSync("gpg", ["--batch", "--import"], { cwd: repoDir, env: { ...process.env, GNUPGHOME: verifyHome }, input: pub, stdio: "pipe" });

    run("git", ["init", "-q"]);
    run("git", ["config", "user.name", "Release Test"]);
    run("git", ["config", "user.email", "release-test@example.org"]);
    run("git", ["commit", "--allow-empty", "-q", "--no-verify", "-m", "chore(release): seed test commit"]);
    run("git", ["tag", "-a", "v0.1.1-unsigned", "-m", "unsigned annotated tag"]);
    run("git", ["tag", "-s", "v0.1.1-signed", "-m", "signed release tag"], signHome);

    assert.equal(run("git", ["cat-file", "-t", "v0.1.1-unsigned"]).trim(), "tag");
    assert.equal(run("git", ["cat-file", "-t", "v0.1.1-signed"]).trim(), "tag");
    assert.throws(() => run("git", ["verify-tag", "v0.1.1-unsigned"], verifyHome));
    run("git", ["verify-tag", "v0.1.1-signed"], verifyHome);
  } finally {
    rmSync(repoDir, { recursive: true, force: true });
    rmSync(signHome, { recursive: true, force: true });
    rmSync(verifyHome, { recursive: true, force: true });
  }
});
