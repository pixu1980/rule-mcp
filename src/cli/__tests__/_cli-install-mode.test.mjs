

/** Regression: the public CLI must parse and propagate --mode. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../../..", import.meta.url).pathname;
const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp-cli-mode-"));
const piDir = join(fakeHome, ".pi", "agent");
const output = execFileSync(process.execPath, [join(root, "bin", "rule-mcp.js"), "install", "--agent", "pi", "--mode", "daemon", "--json"], {
  cwd: root,
  env: { ...process.env, HOME: fakeHome, PI_CODING_AGENT_DIR: piDir },
  encoding: "utf8",
});

assert.equal(JSON.parse(output).ok, true, "CLI install must succeed");
const config = JSON.parse(readFileSync(join(piDir, "mcp.json"), "utf8"));
assert.equal(config.mcpServers["rule-mcp"].url, "http://127.0.0.1:37999/sse");
assert.equal(config.mcpServers["rule-mcp"].command, undefined);

console.log("  ✅ CLI install --mode daemon writes daemon config");
