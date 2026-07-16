/**
 * Regression: Node's child_process.spawn does not expand a leading `~`.
 * MCP stdio configurations must therefore contain concrete absolute paths.
 *
 * When a globally installed pix-galaxy-mcp binary is available the installer
 * prefers it as the single command (like Homebrew tokensave).  Otherwise
 * the config falls back to the local Node + entrypoint pair.
 */
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { mcpServerConfig } from "../src/cli/install.js";

const HOME = homedir();
const entrypoint = join(HOME, "Projects", "pix-galaxy-mcp", "bin", "pix-galaxy-mcp.js");
const config = mcpServerConfig(entrypoint).pix_galaxy_mcp;

// Invariant: command is always an absolute path (never "~" shorthand).
assert.equal(typeof config.command, "string", "command must be a string");
assert.ok(config.command.startsWith("/"), `command must be absolute, got ${config.command}`);
assert.equal(config.command.startsWith("~"), false, "command must never use tilde shorthand");

// When a global binary is available, the config uses the single-binary form.
const globalPnpx = join(HOME, "Library", "pnpm", "bin", "pix-galaxy-mcp");
const globalBrew = "/opt/homebrew/bin/pix-galaxy-mcp";
if (existsSync(globalPnpx) || existsSync(globalBrew)) {
  assert.deepEqual(config.args, ["serve"], "global binary needs only 'serve' arg");
} else {
  // Fallback: local development uses Node + entrypoint pair.
  assert.deepEqual(config.args, [entrypoint, "serve"], "local dev uses Node + entrypoint args");
}
assert.equal(config.args[0]?.startsWith?.("~") ?? false, false, "args must never use tilde shorthand");

console.log("  ✅ stdio installer config uses absolute executable paths");
