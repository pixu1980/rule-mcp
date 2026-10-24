/**
 * The systemd unit written, enabled and removed for real.
 *
 * `systemctl` is stubbed on PATH so the enable/start/failure arms run without
 * a systemd on the machine; the unit itself lands in a scratch HOME. See
 * `./_service-install.fixture.mjs` for why this covers Linux and not Windows.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const FIXTURE = fileURLToPath(new URL("_service-install.fixture.mjs", import.meta.url));

/** Install then uninstall the unit with systemctl behaving as asked. */
function lifecycle(behavior) {
  return JSON.parse(execFileSync(process.execPath, [FIXTURE, behavior], { encoding: "utf8", timeout: 60_000 }));
}

test("installing writes a unit that runs this checkout, then removes it", () => {
  const run = lifecycle("present");

  assert.equal(run.install.ok, true, `the install must succeed: ${JSON.stringify(run.install)}`);
  assert.equal(run.install.action, "enabled-and-started");
  assert.equal(run.unitWritten, true, "the unit file lands on disk");
  assert.equal(run.unitNamesEntrypoint, true, "and it runs the SSE entrypoint");

  assert.equal(run.uninstall.ok, true);
  assert.equal(run.uninstall.action, "stopped-disabled-removed");
  assert.equal(run.unitRemoved, true, "the unit file is gone afterwards");
});

test("a missing systemctl still writes the unit rather than failing the install", () => {
  const run = lifecycle("absent");

  assert.equal(run.install.ok, true, "a machine without systemctl still gets its unit");
  assert.equal(run.unitWritten, true);
  assert.equal(run.unitRemoved, true, "and the removal still cleans it up");
});

test("a systemctl that reports a failure fails the install, and says what it said", () => {
  const run = lifecycle("failing");

  assert.equal(run.install.ok, false, "a failed restart is not a successful install");
  assert.match(run.install.error, /systemctl restart failed/, "the error names the step");
  assert.match(run.install.error, /Failed to restart rule-mcp/, "and quotes what systemctl said");
  assert.equal(run.install.action, undefined, "a failed install claims no action");
  assert.equal(run.unitWritten, true, "the unit was written before the restart was attempted");
});
