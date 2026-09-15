

/**
 * The Windows service arms, run on a machine that has no `sc.exe`.
 *
 * That is the point: the daemon command reaches these functions on every
 * platform, so a missing service manager has to answer "not installed" rather
 * than throw. The dry runs are checked for what they promise, and the reads
 * for what they report when the query cannot run at all.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { checkWindowsService, getWindowsServiceCommand, installWindowsService, uninstallWindowsService, WINDOWS_SERVICE_NAME } from "../_windows-service.js";

test("the service command quotes both halves, so a path with a space survives", () => {
  const command = getWindowsServiceCommand();

  assert.match(command, /^".+" ".+" serve --transport sse$/, command);
});

test("a dry-run install promises the command it would register", () => {
  const result = installWindowsService({ dryRun: true });

  assert.equal(result.ok, true);
  assert.equal(result.name, WINDOWS_SERVICE_NAME);
  assert.match(result.action, /^dry-run \(would create service: /);
  assert.ok(result.action.includes("serve --transport sse"), "the promise names the command, not just the intent");
});

test("a dry-run install is the default-free call too", () => {
  assert.match(installWindowsService({ dryRun: true }).action, /dry-run/);
});

test("uninstalling a service that is not there reports so instead of failing", () => {
  const result = uninstallWindowsService({ dryRun: true });

  assert.equal(result.ok, true);
  assert.equal(result.name, WINDOWS_SERVICE_NAME);
  assert.ok(["not-installed", "dry-run (would remove service)"].includes(result.action), `an absent service manager answers plainly: ${result.action}`);
});

test("the status read answers a shape, never a throw, with no service manager", () => {
  const status = checkWindowsService();

  assert.equal(status.name, WINDOWS_SERVICE_NAME);
  assert.equal(typeof status.installed, "boolean");
  assert.equal(typeof status.running, "boolean");
  assert.ok(status.pid === null || Number.isInteger(status.pid), "a pid is a number or nothing");

  if (!status.installed) {
    assert.equal(status.running, false, "nothing that is not installed is running");
    assert.equal(status.pid, null);
  }
});
