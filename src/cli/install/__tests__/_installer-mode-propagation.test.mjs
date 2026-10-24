/**
 * Regression: installAgent must pass the selected transport mode to each
 * agent-specific installer instead of silently writing stdio configuration.
 */
import { strict as assert } from "node:assert";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp-mode-propagation-"));
const piDir = join(fakeHome, ".pi", "agent");
const installModule = new URL("../index.js", import.meta.url).href;
const source = [`import { installAgent } from ${JSON.stringify(installModule)};`, 'installAgent({ agent: "pi", entrypoint: "/tmp/rule.js", mode: "daemon" });'].join(" ");
execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "--eval", source], {
  env: { ...process.env, HOME: fakeHome, PI_CODING_AGENT_DIR: piDir },
});

const config = JSON.parse(readFileSync(join(piDir, "mcp.json"), "utf8"));
const server = config.mcpServers["rule-mcp"];
assert.equal(server.command, undefined, "daemon installation must not leave a stdio command");
assert.equal(server.url, "http://127.0.0.1:37999/sse");
assert.match(server.headers?.Authorization ?? "", /^Bearer [a-f0-9]{64}$/i);
assert.match(readFileSync(join(fakeHome, ".local", "share", "rule-mcp", "installed.md"), "utf8"), /Transport: daemon/, "manifest must record the selected transport");

console.log("  ✅ installAgent propagates daemon mode to Pi config");
