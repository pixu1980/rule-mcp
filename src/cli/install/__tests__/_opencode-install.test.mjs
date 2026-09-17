

/**
 * opencode reads `~/.config/opencode/opencode.json`, where an MCP server is
 * `{ type: "local", command: [...] }` under `mcp`. The generic installer wrote
 * an `mcpServers`-shaped `mcp.json` that opencode never reads, so the server
 * was invisible to `/mcps`. This walks a real install and uninstall over a
 * fake home that already holds a user config and the legacy file.
 */
import { strict as assert } from "node:assert";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

const root = new URL("../../../..", import.meta.url).pathname;
const installModule = new URL("../index.js", import.meta.url).href;
const ENTRY = "/tmp/fake-rule-mcp.js";
const USER_INSTRUCTION = "/home/u/tokensave.md";

const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp-opencode-"));
const configDir = join(fakeHome, ".config", "opencode");
const configFile = join(configDir, "opencode.json");
const instructionsFile = join(configDir, "instructions.md");
const legacyFile = join(configDir, "mcp.json");

const run = (expression) =>
  execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "--eval", expression], {
    cwd: root,
    env: { ...process.env, HOME: fakeHome },
  });

mkdirSync(configDir, { recursive: true });
writeFileSync(
  configFile,
  JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      instructions: [USER_INSTRUCTION],
      mcp: {
        tokensave: { type: "local", command: ["tokensave", "serve"] },
        // The hand-edit that stopped opencode from loading its config: a
        // `command` string with `args` beside it is not schema-valid.
        "rule-mcp": { type: "local", command: "/old/bin/rule-mcp", args: ["serve"] },
      },
    },
    null,
    2,
  ) + "\n",
);
// What the generic installer used to write here: a file opencode never reads.
writeFileSync(legacyFile, JSON.stringify({ mcpServers: { "rule-mcp": { command: "/old/bin" }, keep: {} } }, null, 2) + "\n");

run(`import { installAgent } from ${JSON.stringify(installModule)}; installAgent({ agent: "opencode", entrypoint: ${JSON.stringify(ENTRY)} });`);

const installed = JSON.parse(readFileSync(configFile, "utf8"));
const server = installed.mcp["rule-mcp"];

assert.ok(server, "the server lands under the `mcp` key opencode reads");
assert.equal(server.type, "local", "opencode's local type replaces the mcpServers shape");
assert.equal(server.enabled, true, "the server starts enabled");
assert.ok(Array.isArray(server.command), "opencode takes the command as an array");
assert.equal(server.command.at(-1), "serve", "the argument rides inside the command array");
assert.equal(server.args, undefined, "the stale args key is dropped - opencode rejects unknown keys");
assert.equal(server.environment.RULE_MCP_NO_AUTOUPDATE, "0", "the opt-out env carries into `environment`");
assert.deepEqual(installed.mcp.tokensave, { type: "local", command: ["tokensave", "serve"] }, "the user's own server survives");
assert.ok(installed.instructions.includes(USER_INSTRUCTION), "the user's instruction survives");
assert.ok(installed.instructions.includes(instructionsFile), "the instruction file is registered so opencode reads it");
assert.ok(readFileSync(instructionsFile, "utf8").includes("rule-mcp"), "instructions.md carries the blocks");

const legacy = JSON.parse(readFileSync(legacyFile, "utf8"));
assert.equal(legacy.mcpServers["rule-mcp"], undefined, "the entry the old installer wrote is swept");
assert.deepEqual(legacy.mcpServers.keep, {}, "other legacy servers survive");

run(`import { uninstallAgent } from ${JSON.stringify(installModule)}; uninstallAgent({ agent: "opencode" });`);

const removed = JSON.parse(readFileSync(configFile, "utf8"));
assert.equal(removed.mcp["rule-mcp"], undefined, "the uninstall drops the server");
assert.deepEqual(removed.mcp.tokensave, { type: "local", command: ["tokensave", "serve"] }, "the user's server survives the uninstall");
assert.ok(!removed.instructions.includes(instructionsFile), "the instruction registration is dropped");
assert.ok(removed.instructions.includes(USER_INSTRUCTION), "the user's instruction survives the uninstall");

rmSync(fakeHome, { recursive: true, force: true });

console.log("  ✅ opencode config installed and uninstalled in opencode's own shape");
