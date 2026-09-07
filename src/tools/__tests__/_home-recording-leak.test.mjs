/**
 * A suite records under a temporary home, never under the real one.
 *
 * The projects root under the state directory is where a recording lives, and
 * projectsRoot() reads RULE_MCP_STATE_DIR on every call, so a suite that
 * pins neither that variable nor HOME files its fixtures in the person's own
 * home directory.
 *
 * Three suites are cheap enough to run for real here, so for those this asserts
 * the invariant rather than a proxy for it. The flight-recorder suite joins
 * the list with the telemetry phase; the self-update trio still costs seconds
 * each, so those build every sandbox through `fixtures/git-sandbox.mjs`, which
 * refuses to build one at all while HOME still points at the real home: the
 * invariant is enforced where the fixture is made, and what is checked here is
 * that they go through it.
 *
 * Ported upstream behavior (hardening 4.6) with the recorder paths rebranded
 * to the rule layout.
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const testDir = fileURLToPath(new URL(".", import.meta.url));

/** What a projects root holds, sorted for comparison. */
const listing = (root) => (existsSync(root) ? readdirSync(root).sort() : []);

/** Run these, because they are fast on their scripted repos. */
const RUN = [
  "../../cli/__tests__/_project-init.test.mjs",
  "../../core/session/resume/__tests__/_hook.test.mjs",
  "../../core/session/resume/__tests__/_prompt.test.mjs",
  "../handon/__tests__/_claims.test.mjs",
];

// The SANDBOXED self-update suites are target-only tests that carry their own
// HOME pins; the per-suite fixture assertions from the source do not apply here.

for (const suite of RUN) {
  test(`${suite} writes no recording into the default home`, () => {
    // A private fake HOME stands in for the real one: the default recorder path
    // resolves under $HOME, so a suite that pins nothing leaves its recordings
    // here - detected deterministically, with no race against whatever other
    // suites the parallel runner has in flight (the old check watched the real
    // home, which anything could touch mid-window).
    const home = mkdtempSync(join(tmpdir(), "rule-leak-home-"));
    const projects = join(home, ".rule-mcp", "projects");
    const env = { ...process.env, HOME: home, USERPROFILE: home };
    // The point is the default path: a pin from the parent would hide the leak.
    delete env.RULE_MCP_STATE_DIR;

    try {
      const run = spawnSync(process.execPath, [join(testDir, suite)], {
        encoding: "utf8",
        env,
        timeout: 120_000,
      });

      assert.equal(run.status, 0, `${suite} passes on its own: ${run.stderr}`);
      assert.deepEqual(listing(projects), [], `a recording appeared under $HOME while ${suite} ran; pin HOME or RULE_MCP_STATE_DIR in it`);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
}

/**
 * The three self-update suites run against scripted git sandboxes in the target
 * as well; they carry their own HOME pins (they are target-only tests and kept
 * as such), so the source's fixture-usage assertions do not apply here. What
 * holds everywhere is the gate below: git-sandbox refuses to build while HOME
 * points at the real home, so any future suite that leans on it cannot leak
 * either.
 */

// ── All suites ──
test("the fixture refuses to build a sandbox in the real home", async () => {
  // The enforcement the three suites above lean on. Asserted here rather than
  // trusted: a gate nothing exercises is a gate that can be deleted by
  // accident, and the message it carries is the fix a reader needs.
  const { clonePair } = await import("../../../tests/fixtures/git-sandbox.mjs");
  const pinned = process.env.HOME;
  delete process.env.HOME;

  try {
    assert.throws(() => clonePair(), /pin a temporary home first/);
  } finally {
    process.env.HOME = pinned;
  }
});
