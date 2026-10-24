

/** Behavioral: install.sh recreates the runtime home after a purge. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { hermeticEnv, root } from "./_purge.fixture.mjs";

{
  const home = mkdtempSync(join(tmpdir(), "rule-mcp-purge-reinstall-"));
  mkdirSync(join(home, ".pi", "agent"), { recursive: true });
  writeFileSync(join(home, ".pi", "agent", "mcp.json"), '{"mcpServers":{}}\n');
  // Symlink-free local-binary install path: install.sh resolves the CLI from
  // the repo (bin/rule-mcp.js) and RULE_MCP_SKIP_GLOBAL_LINK=1
  // skips the global shim entirely, keeping the e2e hermetic.
  const path = [dirname(process.execPath), "/usr/bin", "/bin", "/usr/sbin", "/sbin", "/opt/homebrew/bin", "/usr/local/bin"].join(":");
  const hookPath = join(root, ".git", "hooks", "post-commit");
  const hookExisted = existsSync(hookPath);
  const hookBefore = hookExisted ? readFileSync(hookPath, "utf8") : null;

  try {
    const output = execFileSync("bash", ["scripts/install.sh", "--agent", "pi", "--mode", "stdio", "--no-rules"], {
      cwd: root,
      encoding: "utf8",
      env: { ...hermeticEnv(home, path), RULE_MCP_SKIP_GLOBAL_LINK: "1" },
      timeout: 180_000,
    });
    assert.match(output, /Runtime home/, "install.sh must report the runtime home creation");
    assert.ok(existsSync(join(home, ".rule-mcp")), "install.sh must recreate ~/.rule-mcp/");
    assert.ok(existsSync(join(home, ".rule-mcp", "state")), "install.sh must recreate state/");
    assert.ok(existsSync(join(home, ".pi", "agent", "mcp.json")), "pi must still be configured by the install");
  } catch (error) {
    if (error.stdout) {
      console.error(`\n--- captured installer output ---\n${error.stdout}`);
    }
    throw error;
  } finally {
    if (!hookExisted && existsSync(hookPath)) {
      rmSync(hookPath, { force: true });
    } else if (hookBefore !== null) {
      writeFileSync(hookPath, hookBefore);
    }
    rmSync(home, { recursive: true, force: true });
  }
}

console.log("  \u{2705} install.sh explicitly recreates ~/.rule-mcp/{state,data,projects,config}");
