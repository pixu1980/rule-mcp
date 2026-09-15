/**
 * Remote transport support: an error by default, a warning with `--force`.
 *
 * Daemon and docker configs are verified only for pi and vscode, but the
 * writers know the shape for every agent: `--force` means "my client speaks
 * SSE, write it anyway". Without the flag the install fails loudly instead
 * of writing a server entry that can never connect.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { checkRemoteSupport } from "../_agent-ops.js";

test("stdio needs no remote support from anyone", () => {
  assert.equal(checkRemoteSupport("cursor", "stdio", false), null);
});

test("a supported agent passes in any mode", () => {
  assert.equal(checkRemoteSupport("pi", "daemon", false), null);
  assert.equal(checkRemoteSupport("vscode", "docker", false), null);
});

test("an unsupported agent fails loudly without force", () => {
  const verdict = checkRemoteSupport("cursor", "daemon", false);

  assert.match(verdict.error, /only for Pi and VS Code/, "the error names the way out");
});

test("force downgrades the failure to a warning", () => {
  const verdict = checkRemoteSupport("cursor", "daemon", true);

  assert.equal(verdict.error, undefined, "no failure when the user insisted");
  assert.match(verdict.warning, /cursor/, "the warning names who is unverified");
  assert.match(verdict.warning, /stdio/, "the warning keeps the safe default visible");
});
