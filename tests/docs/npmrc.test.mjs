import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Security fixes must arrive on their own, after a short delay (OSS-14).
 *
 * Exact pins freeze every transitive fix until somebody bumps it by hand.
 * Dependabot opens those bumps weekly, and minimum-release-age holds each
 * new release back three days so a compromised publish does not land here
 * on day zero. The cooldown lives in .npmrc, so this test reads it back:
 * a key that can be dropped silently will be.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("the install cooldown is three days", () => {
  const npmrc = readFileSync(join(root, ".npmrc"), "utf8");
  const cooldown = /^\s*minimum-release-age\s*=\s*(\S+)\s*$/mu.exec(npmrc)?.[1];

  assert.equal(cooldown, "4320", "a new release must wait three days before pnpm adopts it");
});
