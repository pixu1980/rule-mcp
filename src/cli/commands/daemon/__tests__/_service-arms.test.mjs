/**
 * What `daemon install/uninstall/enable/disable` prints on each platform.
 *
 * The arms are chosen by constants read from `os.platform()` at load, so each
 * case runs in a child that fixes the platform first (see
 * `./_service-arms.fixture.mjs`). Install and uninstall are dry runs.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const FIXTURE = fileURLToPath(new URL("_service-arms.fixture.mjs", import.meta.url));

/** What the action printed under the forced platform. */
function output(forced, action) {
  return JSON.parse(execFileSync(process.execPath, [FIXTURE, forced, action], { encoding: "utf8", timeout: 60_000 })).output;
}

test("install names the artifact each platform creates", () => {
  assert.match(output("darwin", "install"), /LaunchAgent created:/, "macos reports the plist");
  assert.match(output("darwin", "install"), /Login Items & Extensions/, "and where the user will see it");
  assert.match(output("linux", "install"), /systemd unit created:/, "linux reports the unit");
  assert.match(output("win32", "install"), /Windows service created: rule-mcp/, "windows reports the service");
  assert.match(output("freebsd", "install"), /Service installed \(process\)/, "an unsupported platform falls back to the process daemon");
});

test("install says it is only a preview on every platform", () => {
  for (const forced of ["darwin", "linux", "win32", "freebsd"]) {
    const text = output(forced, "install");

    assert.match(
      text,
      new RegExp(`Installing ${forced === "win32" ? "windows" : forced === "freebsd" ? "unknown" : forced === "darwin" ? "macos" : forced} daemon service`),
      `${forced}: the opening line names the platform`,
    );
    assert.ok(!text.includes("✗ Failed"), `${forced}: a dry run is not a failure:\n${text}`);
  }
});

test("uninstall reports what it removed, and never reports a false failure", () => {
  for (const forced of ["darwin", "linux", "win32", "freebsd"]) {
    const text = output(forced, "uninstall");

    assert.match(text, /Removing \w+ daemon service/, `${forced}: it says what it is removing`);
    assert.match(text, /✓ \S+ service removed \(/, `${forced}: the removal is reported as a success:\n${text}`);
    assert.ok(!text.includes("unknown error"), `${forced}: a successful removal must not print an error:\n${text}`);
  }
});

test("enable and disable refuse a platform with no native service", () => {
  assert.match(output("freebsd", "enable"), /No native service for this platform/, "enable says there is nothing to load");
  assert.match(output("freebsd", "enable"), /daemon install/, "and points at the command that would create one");

  assert.match(output("freebsd", "disable"), /No native service for this platform/, "disable says the same");
  assert.match(output("freebsd", "disable"), /daemon uninstall/, "and points at the matching command");
});

test("enable and disable name the service they act on", () => {
  // Only the platforms whose service tooling is absent here: a forced darwin
  // would shell out to the real launchctl on the machine running the tests.
  // win32 matters most: a Windows service has no file on disk, so a guard on
  // the service path skipped these branches entirely.
  for (const forced of ["linux", "win32"]) {
    assert.match(output(forced, "enable"), /Enabling service: rule-mcp/, `${forced}: enable names the service`);
    assert.match(output(forced, "enable"), /enabled and started/, `${forced}: and reports the outcome`);

    assert.match(output(forced, "disable"), /Disabling service: rule-mcp/, `${forced}: disable names the service`);
    assert.match(output(forced, "disable"), /stopped and disabled/, `${forced}: and reports the outcome`);
  }
});
