

/**
 * Regression: Node's child_process.spawn does not expand a leading `~`.
 * MCP stdio configurations must therefore contain concrete absolute paths.
 *
 * When a globally installed rule-mcp binary is available the installer
 * prefers it as the single command (like Homebrew tokensave).  Otherwise
 * the config falls back to the local Node + entrypoint pair.
 */
import { strict as assert } from "node:assert";
import { homedir } from "node:os";
import { join } from "node:path";
import { mcpServerConfig, DEFAULT_OPTOUT_ENV } from "../index.js";
import { resolveGlobalBinary } from "../../installers/_paths.js";

const HOME = homedir();
const entrypoint = join(HOME, "Projects", "rule-mcp", "bin", "rule-mcp.js");
const config = mcpServerConfig(entrypoint)["rule-mcp"];

// Invariant: generated stdio config ships every opt-out flag at its own default
// (feature ON), so the switches are discoverable and easy to flip in the user's
// mcp.json. Prompt suppression is the single exception, and ships suppressed so
// Claude Code shows the clean /rule-mcp-* commands instead of MCP prompt names
// (ADR 028): the flag is still discoverable, its value is just already flipped.
for (const [k, v] of Object.entries(DEFAULT_OPTOUT_ENV)) {
  assert.equal(config.env?.[k], v, `${k} must default to "${v}" in generated config`);
}

assert.equal(DEFAULT_OPTOUT_ENV.RULE_MCP_NO_PROMPTS, "1", "MCP prompts stay suppressed by default");

// Invariant: command is always an absolute path (never "~" shorthand).
assert.equal(typeof config.command, "string", "command must be a string");
assert.ok(config.command.startsWith("/"), `command must be absolute, got ${config.command}`);
assert.equal(config.command.startsWith("~"), false, "command must never use tilde shorthand");

// Prefer the same resolver the installer uses (candidates + PATH), not a
// hard-coded subset of paths that can disagree with `command -v`.
const globalBin = resolveGlobalBinary();
if (globalBin) {
  assert.equal(config.command, globalBin, "stdio command tracks resolveGlobalBinary");
  assert.deepEqual(config.args, ["serve"], "global binary needs only 'serve' arg");
} else {
  // Fallback: local development uses Node + entrypoint pair.
  assert.deepEqual(config.args, [entrypoint, "serve"], "local dev uses Node + entrypoint args");
}
assert.equal(config.args[0]?.startsWith?.("~") ?? false, false, "args must never use tilde shorthand");

console.log("  ✅ stdio installer config uses absolute executable paths");
