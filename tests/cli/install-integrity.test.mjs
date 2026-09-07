/**
 * Hardening 3.3 (F-S5): the published checksums match the scripts that ship.
 *
 * A checksum file that drifts from its scripts is worse than none: it teaches
 * people that a mismatch is normal. This regenerates the digests and compares,
 * so editing an installer without refreshing SHA256SUMS fails CI rather than
 * shipping a false integrity claim.
 */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptsDir = fileURLToPath(new URL("../../scripts", import.meta.url));
const published = readFileSync(join(scriptsDir, "SHA256SUMS"), "utf8");

test("every shipped script has a published digest", () => {
  const scripts = readdirSync(scriptsDir).filter((name) => name.endsWith(".sh") || name.endsWith(".ps1"));
  assert.ok(scripts.length > 0, "there are scripts to publish");
  for (const name of scripts) {
    assert.ok(published.includes(`  scripts/${name}\n`), `${name} has no published digest - run node scripts/build/checksums/index.mjs`);
  }
});

test("the published digests are the digests of these files", () => {
  for (const line of published.split("\n")) {
    if (line.trim() === "") {
      continue;
    }
    const [digest, path] = line.split(/\s+/, 2);
    const name = path.replace(/^scripts\//, "");
    const actual = createHash("sha256")
      .update(readFileSync(join(scriptsDir, name)))
      .digest("hex");
    assert.equal(actual, digest, `${name} changed without refreshing SHA256SUMS`);
  }
});
