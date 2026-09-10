/**
 * End-to-end: a broken shim must not turn into a silently skipped install.
 *
 * The whole bootstrap runs against a fake HOME whose PATH holds a shim that
 * resolves and then crashes. The agent must still be configured, and the
 * run must say what it did about the shim rather than swallowing it.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../..", import.meta.url));

test("a crashing shim still yields a configured agent", () => {
  const home = mkdtempSync(join(tmpdir(), "rule-shim-e2e-"));

  mkdirSync(join(home, ".pi", "agent"), { recursive: true });
  mkdirSync(join(home, "bin"), { recursive: true });
  writeFileSync(join(home, ".pi", "agent", "mcp.json"), '{"mcpServers":{}}\n');
  writeFileSync(join(home, "bin", "rule-mcp"), "#!/bin/sh\nexit 3\n", { mode: 0o755 });

  const hookPath = join(root, ".git", "hooks", "post-commit");
  const hookExisted = existsSync(hookPath);
  const hookBefore = hookExisted ? readFileSync(hookPath, "utf8") : null;

  // A minimal PATH keeps the run hermetic: the fake bin (broken shim), the
  // running node, and the system directories.
  const path = [join(home, "bin"), dirname(process.execPath), "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");

  try {
    const output = execFileSync("bash", ["scripts/install.sh", "--agent", "pi", "--mode", "stdio", "--no-rules", "--no-git-hook", "--no-doctor"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        PATH: path,
        // Never the real one: the shim is written and removed here.
        PNPM_HOME: join(home, ".pnpm"),
        RULE_MCP_HOME: join(home, ".rule-mcp"),
        TERM: "dumb",
      },
      timeout: 120_000,
    });

    assert.match(output, /Global shim - relinked/, "the run must report what it did about the stale shim");
    assert.match(output, /Configure pi/, "pi must be configured, not silently skipped");

    const mcp = JSON.parse(readFileSync(join(home, ".pi", "agent", "mcp.json"), "utf8"));

    assert.ok(mcp.mcpServers["rule-mcp"], "pi mcp.json must contain the server entry");
  } catch (error) {
    if (error.stdout) {
      console.error(`\n--- captured installer output ---\n${error.stdout}`);
    }

    throw error;
  } finally {
    // Restore the repository's post-commit hook to its pre-test state.
    if (!hookExisted) {
      rmSync(hookPath, { force: true });
    } else if (hookBefore !== null) {
      writeFileSync(hookPath, hookBefore);
    }

    rmSync(home, { recursive: true, force: true });
  }
});
