

/**
 * Behavioral: `uninstall.sh --purge` and `--keep-config` against a fake HOME.
 *
 * The bootstrap forwards to the wizard's uninstall plan (ADR 080), so this is
 * the end-to-end proof that a purge takes the runtime home AND the
 * configuration directory - the one that was left behind, with the daemon
 * token and any stored model key in it.
 */
import { strict as assert } from "node:assert";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { runUninstall, seedHome } from "./_purge.fixture.mjs";

test("--purge takes the runtime home and the configuration with it", () => {
  const home = seedHome();

  try {
    const output = runUninstall(home, []);

    assert.match(output, /Purge state and config/, "the plan must name the step that deletes them");
    assert.ok(!existsSync(join(home, ".rule-mcp")), "--purge must delete ~/.rule-mcp/");
    assert.ok(!existsSync(join(home, ".config", "rule-mcp")), "--purge must also delete ~/.config/rule-mcp/");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("--keep-config keeps both directories, token and all", () => {
  const home = seedHome();

  try {
    runUninstall(home, ["--keep-config"]);

    assert.ok(existsSync(join(home, ".rule-mcp")), "--keep-config must keep the runtime home");
    assert.ok(existsSync(join(home, ".config", "rule-mcp")), "--keep-config must keep ~/.config/rule-mcp/");
    assert.ok(existsSync(join(home, ".rule-mcp", "state", "sse-token")), "--keep-config must keep the SSE token untouched");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
