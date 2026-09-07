/** Behavioral: uninstall.sh --purge / --keep-config against a seeded fake HOME. */
import { strict as assert } from "node:assert";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { runUninstall, seedHome } from "./_purge.fixture.mjs";

// --purge alone: both ~/.config/pix-galaxy-mcp AND ~/.pix-galaxy-mcp go away.
{
  const home = seedHome();
  try {
    const output = runUninstall(home, []);
    assert.match(output, /Runtime home deleted/, "uninstall.sh --purge must report the runtime home deletion");
    assert.doesNotMatch(output, /No runtime home found/, "the runtime home must have been found, not skipped");
    assert.ok(!existsSync(join(home, ".pix-galaxy-mcp")), "--purge must delete ~/.pix-galaxy-mcp/");
    assert.ok(
      !existsSync(join(home, ".config", "pix-galaxy-mcp")),
      "--purge must also delete ~/.config/pix-galaxy-mcp/",
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

// --purge --keep-config: both config/runtime directories survive.
{
  const home = seedHome();
  try {
    runUninstall(home, ["--keep-config"]);
    assert.ok(existsSync(join(home, ".pix-galaxy-mcp")), "--keep-config must keep the runtime home");
    assert.ok(existsSync(join(home, ".config", "pix-galaxy-mcp")), "--keep-config must keep ~/.config/pix-galaxy-mcp/");
    assert.ok(
      existsSync(join(home, ".pix-galaxy-mcp", "state", "sse-token")),
      "--keep-config must keep the SSE token untouched",
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

console.log(
  "  \u{2705} uninstall --purge removes ~/.pix-galaxy-mcp/ (+ ~/.config/pix-galaxy-mcp/), --keep-config keeps both",
);
