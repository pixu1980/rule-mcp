

/** Regression: config --mode daemon must emit the daemon/SSE MCP snippet. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../../..", import.meta.url).pathname;
const fakeHome = mkdtempSync(join(tmpdir(), "rule-config-mode-"));
const output = execFileSync(process.execPath, [join(root, "bin", "rule-mcp.js"), "config", "--mode", "daemon"], {
  cwd: root,
  env: { ...process.env, HOME: fakeHome },
  encoding: "utf8",
});
const server = JSON.parse(output)["rule-mcp"];

assert.equal(server.command, undefined);
assert.equal(server.url, "http://127.0.0.1:37999/sse");
assert.match(server.headers?.Authorization ?? "", /^Bearer [a-f0-9]{64}$/i);

console.log("  ✅ CLI config --mode daemon emits remote SSE configuration");
