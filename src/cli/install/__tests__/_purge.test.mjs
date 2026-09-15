// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
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
    assert.ok(!existsSync(join(home, ".pix-galaxy-mcp")), "--purge must delete ~/.pix-galaxy-mcp/");
    assert.ok(!existsSync(join(home, ".config", "pix-galaxy-mcp")), "--purge must also delete ~/.config/pix-galaxy-mcp/");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("--keep-config keeps both directories, token and all", () => {
  const home = seedHome();

  try {
    runUninstall(home, ["--keep-config"]);

    assert.ok(existsSync(join(home, ".pix-galaxy-mcp")), "--keep-config must keep the runtime home");
    assert.ok(existsSync(join(home, ".config", "pix-galaxy-mcp")), "--keep-config must keep ~/.config/pix-galaxy-mcp/");
    assert.ok(existsSync(join(home, ".pix-galaxy-mcp", "state", "sse-token")), "--keep-config must keep the SSE token untouched");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
