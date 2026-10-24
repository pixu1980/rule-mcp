

/**
 * The Windows service arms, run on a machine that has no `sc.exe`.
 *
 * That is the point: the daemon command reaches these functions on every
 * platform, so a missing service manager has to answer "not installed" rather
 * than throw. The dry runs are checked for what they promise, and the reads
 * for what they report when the query cannot run at all.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkWindowsService, getWindowsServiceCommand, installWindowsService, uninstallWindowsService, WINDOWS_SERVICE_NAME } from "../_windows-service.js";

const ARMS = fileURLToPath(new URL("../_windows-service.js", import.meta.url));

test("the arms leave no null-device artifact in the directory they run from", () => {
  const scratch = mkdtempSync(join(tmpdir(), "rule-mcp-windows-arms-"));

  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const arms = await import(${JSON.stringify(ARMS)});
       arms.uninstallWindowsService({ dryRun: true });
       arms.checkWindowsService();`,
    ],
    { cwd: scratch, encoding: "utf8", timeout: 60_000 },
  );

  // `sc query ... 2>nul` is cmd syntax. On a host whose shell is not cmd the
  // redirect creates a real file named `nul` here rather than discarding
  // stderr, which is how one kept appearing in the repository root: the only
  // way to exercise this arm off Windows is to call it, and calling it is what
  // shelled out.
  assert.deepEqual(readdirSync(scratch), [], "the probe writes nothing");
});

test("the service command quotes both halves, so a path with a space survives", () => {
  const command = getWindowsServiceCommand([String.raw`C:\Program Files\node\node.exe`, String.raw`C:\my app\cli.js`, "serve", "--transport", "sse"]);

  assert.equal(command, String.raw`"C:\Program Files\node\node.exe" "C:\my app\cli.js" serve --transport sse`, command);
});

test("a quote inside a path is escaped, so it cannot split the binPath into arguments sc reads as its own", () => {
  const command = getWindowsServiceCommand([String.raw`C:\odd "name"\node.exe`, String.raw`C:\app\cli.js`, "serve"]);

  assert.ok(command.startsWith('"'), command);
  assert.ok(command.includes(String.raw`\"name\"`), "the embedded quotes are escaped");
  assert.ok(command.endsWith(" serve"), command);
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

  if (status.installed) {
    return;
  }

  assert.equal(status.running, false, "nothing that is not installed is running");
  assert.equal(status.pid, null);
});
