import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The audit must gate, not just run (OSS-28).
 *
 * scripts/ci/audit-gate/index.mjs already exists: a parseable report
 * with advisories fails, an unrunnable audit warns loudly instead of
 * failing the build on a registry outage. But no workflow calls it -
 * CI runs the bare `pnpm audit --prod`, so a known advisory never
 * blocks anything. Both the CI audit job and the release job must
 * invoke the gate.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("CI audits through the gate, not the bare command", () => {
  const ci = read(".github/workflows/ci.yml");

  assert.ok(ci.includes("pnpm audit:gate"), "the CI audit job must invoke pnpm audit:gate");
  assert.ok(!/^(\s*)-\s*run:\s*pnpm audit --prod\s*$/mu.test(ci), "the bare audit must not run as its own step anymore");
});

test("the release job audits through the gate", () => {
  const release = read(".github/workflows/release.yml");

  assert.ok(release.includes("pnpm audit:gate"), "the release job must invoke pnpm audit:gate");
});
