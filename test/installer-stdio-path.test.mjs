/**
 * Regression: Node's child_process.spawn does not expand a leading `~`.
 * MCP stdio configurations must therefore contain concrete absolute paths.
 */
import { strict as assert } from "node:assert";
import { homedir } from "node:os";
import { join } from "node:path";
import { mcpServerConfig } from "../src/cli/install.js";

const entrypoint = join(homedir(), "Projects", "pix-galaxy-mcp", "bin", "pix-galaxy-mcp.js");
const config = mcpServerConfig(entrypoint).pix_galaxy_mcp;

assert.equal(config.command, process.execPath, "stdio config must use Node's absolute executable path");
assert.deepEqual(config.args, [entrypoint, "serve"], "stdio config must use an absolute server entrypoint");
assert.equal(config.command.startsWith("~"), false, "command must never use tilde shorthand");
assert.equal(config.args[0].startsWith("~"), false, "entrypoint must never use tilde shorthand");

console.log("  ✅ stdio installer config uses absolute executable paths");
