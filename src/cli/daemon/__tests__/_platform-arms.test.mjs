/**
 * Every platform arm of the daemon service surface, not just this machine's.
 *
 * The arms are selected by module-level constants read from `os.platform()`,
 * so each case runs in a child that fixes `process.platform` first; see
 * `./_platform-arms.fixture.mjs`. Everything the child calls is a dry run or a
 * read, so no service is installed anywhere.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const FIXTURE = fileURLToPath(new URL("_platform-arms.fixture.mjs", import.meta.url));

/** Run the surface under a forced platform and return what it reported. */
function underPlatform(forced) {
  return JSON.parse(execFileSync(process.execPath, [FIXTURE, forced], { encoding: "utf8", timeout: 60_000 }));
}

test("darwin installs and removes a LaunchAgent", () => {
  const macos = underPlatform("darwin");

  assert.equal(macos.detected, "macos", "darwin is reported as macos");
  assert.equal(macos.install.service, "launchd");
  assert.match(macos.install.result.action, /^dry-run/, "a dry run writes no plist");
  assert.equal(macos.uninstall.result.action, "not-installed", "there is nothing to remove in a scratch home");
  assert.ok(macos.serviceFilePath.endsWith("io.github.rule.rule-mcp.plist"), `unexpected plist path: ${macos.serviceFilePath}`);
  assert.equal(macos.serviceName, "io.github.rule.rule-mcp", "the label is the service name");
  assert.deepEqual(macos.status.detailKeys, ["launchAgent", "process"], "both the agent and the process are reported");
  assert.match(macos.formatted, /Plist: {6}/, "the rendered status names the plist");
});

test("linux installs and removes a systemd user unit", () => {
  const linux = underPlatform("linux");

  assert.equal(linux.detected, "linux");
  assert.equal(linux.install.service, "systemd");
  assert.match(linux.install.result.action, /^dry-run/, "a dry run writes no unit");
  assert.equal(linux.uninstall.result.action, "not-installed");
  assert.ok(linux.serviceFilePath.endsWith("systemd/user/rule-mcp.service"), `unexpected unit path: ${linux.serviceFilePath}`);
  assert.equal(linux.serviceName, "rule-mcp", "the unit name is the service name");
  assert.deepEqual(linux.status.detailKeys, ["process", "systemd"]);
  assert.match(linux.formatted, /Unit: {7}/, "the rendered status names the unit");
});

test("win32 installs and removes a Windows service", () => {
  const windows = underPlatform("win32");

  assert.equal(windows.detected, "windows");
  assert.equal(windows.install.service, "windows-service");
  assert.match(windows.install.result.action, /^dry-run/, "a dry run creates no service");
  // `sc` cannot run here, so the uninstall probe reads as inconclusive rather
  // than as the 1060 a real Windows would return for a missing service: accept
  // either, and let the assertion be that it never claims to have removed one.
  assert.match(windows.uninstall.result.action, /^(dry-run|not-installed)/, `unexpected action: ${windows.uninstall.result.action}`);
  assert.equal(windows.serviceFilePath, null, "a Windows service has no file on disk");
  assert.equal(windows.serviceName, "rule-mcp");
  assert.deepEqual(windows.status.detailKeys, ["process", "windowsService"]);
  assert.match(windows.formatted, /Service: {4}windows-service/, "the rendered status names the service");
});

test("an unrecognized platform falls back to the process daemon", () => {
  const other = underPlatform("freebsd");

  assert.equal(other.detected, "unknown", "an unsupported platform is named unknown, not guessed at");
  assert.equal(other.install.service, "process", "the fallback is the process daemon");
  assert.match(other.install.result.action, /^dry-run/, "and it is still a dry run");
  assert.equal(other.uninstall.result.action, "not-running", "with no pid file there is nothing to stop");
  assert.equal(other.serviceFilePath, null, "no native service means no file");
  assert.equal(other.serviceName, null, "and no name");
  assert.deepEqual(other.status.detailKeys, ["process"], "only the process is reported");
});

test("every arm renders the same status skeleton", () => {
  for (const forced of ["darwin", "linux", "win32", "freebsd"]) {
    const { formatted, status } = underPlatform(forced);

    for (const label of ["Platform:", "Service:", "Installed:", "Loaded:", "Running:", "PID file:", "Log file:"]) {
      assert.ok(formatted.includes(label), `${forced}: the status must carry ${label}`);
    }

    assert.ok(!formatted.includes("PID:"), `${forced}: no PID line when nothing is running`);
    assert.equal(status.installed, false, `${forced}: a scratch home has no service installed`);
  }
});
