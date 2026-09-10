/**
 * Behavioral: `uninstall.sh --purge` and `--keep-config` against a seeded
 * fake HOME, through the bootstrap the user actually runs.
 */
import { strict as assert } from "node:assert";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { runUninstall, seedHome } from "./_purge.fixture.mjs";

test("--purge deletes the runtime home and the env config directory", () => {
  const home = seedHome();

  try {
    const output = runUninstall(home, []);

    assert.match(output, /Purge state and config/, "the purge step must be reported, not silently performed");
    assert.ok(!existsSync(join(home, ".rule-mcp")), "--purge must delete ~/.rule-mcp/");
    assert.ok(!existsSync(join(home, ".config", "rule-mcp")), "--purge must also delete ~/.config/rule-mcp/");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("--keep-config spares both directories", () => {
  const home = seedHome();

  try {
    const output = runUninstall(home, ["--keep-config"]);

    assert.doesNotMatch(output, /Purge state and config/, "--keep-config must not even plan the purge");
    assert.ok(existsSync(join(home, ".rule-mcp")), "--keep-config must keep the runtime home");
    assert.ok(existsSync(join(home, ".config", "rule-mcp")), "--keep-config must keep ~/.config/rule-mcp/");
    assert.ok(existsSync(join(home, ".rule-mcp", "state", "sse-token")), "--keep-config must keep the SSE token untouched");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
