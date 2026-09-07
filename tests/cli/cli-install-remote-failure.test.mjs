/** Regression: CLI must surface unsupported remote installs as a non-zero exit. */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const fakeHome = mkdtempSync(join(tmpdir(), "rule-cli-remote-failure-"));
const result = spawnSync(process.execPath, [join(root, "bin", "rule-mcp.js"), "install", "--agent", "claude", "--mode", "daemon", "--json"], {
  cwd: root,
  env: { ...process.env, HOME: fakeHome },
  encoding: "utf8",
});

assert.equal(result.status, 1, "CLI must return failure status for unsupported remote install");
assert.equal(JSON.parse(result.stdout).ok, false);

console.log("  ✅ CLI reports unsupported remote install failures");
