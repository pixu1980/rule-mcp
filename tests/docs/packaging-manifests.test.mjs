import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The distribution manifests must name the real owner (OSS-1).
 *
 * Scoop, winget and the Homebrew template named three different GitHub
 * owners, pinned 0.1.0 while the repo said 1.0.0, carried literal
 * PLACEHOLDER hashes and pointed at a tag that does not exist. Every
 * manifest must resolve to github.com/pixu1980/rule, carry
 * the package.json version, and contain no PLACEHOLDER.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const version = JSON.parse(read("package.json")).version;
const OWNER = "github.com/pixu1980/rule";
const STALE_OWNER = /github\.com\/rule([/'"]|$)/u;
const SQUAT_OWNER = /github\.com\/rule\//u;

function assertOwnerAndFresh(file, text) {
  assert.ok(text.includes(OWNER), `${file} must resolve to ${OWNER}`);
  assert.ok(!STALE_OWNER.test(text), `${file} still names the rule-mcp owner`);
  assert.ok(!SQUAT_OWNER.test(text), `${file} still names the rule-mcp owner`);
  assert.ok(!text.includes("PLACEHOLDER"), `${file} still carries a PLACEHOLDER`);
  assert.ok(!text.includes("registry.npmjs.org"), `${file} still points at the npm registry`);
}

test("the scoop manifest tracks the owner and the version", () => {
  const file = ".github/scoop/rule-mcp.json";
  const text = read(file);
  const manifest = JSON.parse(text);

  assertOwnerAndFresh(file, text);
  assert.equal(manifest.version, version, "scoop must carry the package.json version");
});

test("winget is one pixu1980 manifest tracking the version", () => {
  assert.ok(!existsSync(join(root, ".github", "winget", "rule-mcp.rule-mcp.yaml")), "the rule-mcp-namespaced winget manifest is deleted");

  const file = ".github/winget/pixu1980.rule-mcp.yaml";
  const text = read(file);

  assertOwnerAndFresh(file, text);
  assert.ok(text.includes("PackageIdentifier: pixu1980.rule-mcp"), "the identifier must be pixu1980-scoped");
  assert.ok(text.includes("Publisher: pixu1980"), "the publisher must be pixu1980");
  assert.ok(new RegExp(`PackageVersion: ["']?${version}`).test(text), "winget must carry the package.json version");
});

test("the Homebrew template tracks the owner and the release tarball", () => {
  const text = read("scripts/package.sh");

  assertOwnerAndFresh("scripts/package.sh", text);
  assert.ok(text.includes("${VERSION}"), "the formula template must interpolate the release version");
  assert.ok(!text.includes("0.1.0"), "the template must not pin a stale version");
});
