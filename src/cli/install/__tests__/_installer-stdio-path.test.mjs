/**
 * Regression: Node's child_process.spawn does not expand a leading `~`.
 * MCP stdio configurations must therefore contain concrete absolute paths.
 *
 * When a globally installed rule-mcp binary is available the installer
 * prefers it as the single command (like Homebrew tokensave).  Otherwise
 * the config falls back to the local Node + entrypoint pair.
 */
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { mcpServerConfig, DEFAULT_OPTOUT_ENV } from "../index.js";

const HOME = homedir();
const entrypoint = join(HOME, "Projects", "rule-mcp", "bin", "rule-mcp.js");
const config = mcpServerConfig(entrypoint)["rule-mcp"];

// Invariant: generated stdio config ships every opt-out flag at "0" (feature ON)
// so the switches are discoverable and easy to flip in the user's mcp.json.
for (const [k, v] of Object.entries(DEFAULT_OPTOUT_ENV)) {
  assert.equal(config.env?.[k], "0", `${k} must default to "0" in generated config`);
  assert.equal(v, "0", `${k} default must be "0"`);
}

// Invariant: command is always an absolute path (never "~" shorthand).
assert.equal(typeof config.command, "string", "command must be a string");
assert.ok(config.command.startsWith("/"), `command must be absolute, got ${config.command}`);
assert.equal(config.command.startsWith("~"), false, "command must never use tilde shorthand");

// When a global binary is available, the config uses the single-binary form.
const globalPnpx = join(HOME, "Library", "pnpm", "bin", "rule-mcp");
const globalBrew = "/opt/homebrew/bin/rule-mcp";
if (existsSync(globalPnpx) || existsSync(globalBrew)) {
  assert.deepEqual(config.args, ["serve"], "global binary needs only 'serve' arg");
} else {
  // Fallback: local development uses Node + entrypoint pair.
  assert.deepEqual(config.args, [entrypoint, "serve"], "local dev uses Node + entrypoint args");
}
assert.equal(config.args[0]?.startsWith?.("~") ?? false, false, "args must never use tilde shorthand");

console.log("  ✅ stdio installer config uses absolute executable paths");
