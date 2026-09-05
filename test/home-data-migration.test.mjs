/**
 * Home-data migration test.
 *
 * A machine that ran an earlier layout keeps its state in a legacy home
 * directory named by RULE_MCP_LEGACY_HOME. migrateHomeData() must adopt
 * it into ~/.rule-mcp (state/, data/, projects/) exactly once,
 * non-destructively, so the installation id, the SSE token and the per-project
 * recordings survive.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { after, before } from "node:test";

const HOME = mkdtempSync(join(tmpdir(), "rule-home-migrate-"));
const OLD_HOME = join(HOME, ".legacy-home");

before(() => {
  process.env.HOME = HOME;
  process.env.RULE_MCP_HOME = join(HOME, ".rule-mcp");
  process.env.RULE_MCP_LEGACY_HOME = OLD_HOME;
  delete process.env.RULE_MCP_STATE_DIR;

  // Simulate a previous install.
  mkdirSync(join(OLD_HOME, "state"), { recursive: true });
  mkdirSync(join(OLD_HOME, "data"), { recursive: true });
  mkdirSync(join(OLD_HOME, "projects", "demo-1234"), { recursive: true });
  writeFileSync(join(OLD_HOME, "state", "installation-id"), "legacy-id-abc\n");
  writeFileSync(join(OLD_HOME, "state", "sse-token"), "legacy-token-xyz");
  writeFileSync(join(OLD_HOME, "data", "installed.md"), "# installed\n");
  writeFileSync(join(OLD_HOME, "projects", "demo-1234", "telemetry.jsonl"), '{"ts":1}\n');
});

after(() => {
  rmSync(HOME, { recursive: true, force: true });
});

const { migrateHomeData, getRuntimePaths } = await import("../src/cli/paths.js");

const check = (label, cond) => {
  assert.ok(cond, label);
  console.log(`  ✅ ${label}`);
};

check("runtime paths resolve under the new home root", getRuntimePaths().homeDir === join(HOME, ".rule-mcp"));
check(
  "state dir defaults to ~/.rule-mcp/state",
  getRuntimePaths().stateDir === join(HOME, ".rule-mcp", "state"),
);

const result = migrateHomeData();
check("migration reports adoption", result.migrated === true);
check(
  "installation id carried over",
  readFileSync(getRuntimePaths().stateDir + "/installation-id", "utf8").includes("legacy-id-abc"),
);
check("sse token carried over", readFileSync(getRuntimePaths().stateDir + "/sse-token", "utf8") === "legacy-token-xyz");
check("data carried over", existsSync(getRuntimePaths().dataDir + "/installed.md"));
check(
  "projects recording carried over",
  readFileSync(join(getRuntimePaths().homeDir, "projects", "demo-1234", "telemetry.jsonl"), "utf8") === '{"ts":1}\n',
);

const second = migrateHomeData();
check("second call is a no-op", second.migrated === false);

console.log("\nhome-data migration: all checks passed");
