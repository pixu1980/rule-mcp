/** End-to-end: a broken shim must not cause a silent "skipped" install. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { root } from "./_shim.fixture.mjs";

const e2eHome = mkdtempSync(join(tmpdir(), "rule-shim-e2e-"));
mkdirSync(join(e2eHome, ".pi", "agent"), { recursive: true });
mkdirSync(join(e2eHome, "bin"), { recursive: true });
writeFileSync(join(e2eHome, ".pi", "agent", "mcp.json"), '{"mcpServers":{}}\n');
writeFileSync(join(e2eHome, "bin", "rule-mcp"), "#!/bin/sh\nexit 3\n", { mode: 0o755 });
writeFileSync(join(e2eHome, "bin", "pnpm"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });

const hookPath = join(root, ".git", "hooks", "post-commit");
const hookExisted = existsSync(hookPath);
const hookBefore = hookExisted ? readFileSync(hookPath, "utf8") : null;

// A minimal PATH keeps the test hermetic: the fake bin (broken shim + pnpm
// stub), the running node, /usr/bin for bash/git/sed/etc.
const e2ePath = [
  join(e2eHome, "bin"),
  dirname(process.execPath),
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
  "/opt/homebrew/bin",
  "/usr/local/bin",
].join(":");

try {
  const output = execFileSync("bash", ["scripts/install.sh", "--agent", "pi", "--mode", "stdio", "--no-rules"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: e2eHome,
      PATH: e2ePath,
      PNPM_HOME: join(e2eHome, ".pnpm"), // never the real one: uninstall/install write here
      RULE_MCP_SKIP_GLOBAL_LINK: "1",
    },
    timeout: 120_000,
  });

  assert.match(output, /fails to launch - relinking/, "install.sh must notice the broken shim");
  assert.match(output, /Installed for pi/, "pi must be configured, not silently skipped");
  const mcp = JSON.parse(readFileSync(join(e2eHome, ".pi", "agent", "mcp.json"), "utf8"));
  assert.ok(mcp.mcpServers["rule-mcp"], "pi mcp.json must contain the server entry");
} catch (error) {
  if (error.stdout) {
    console.error(`\n--- captured installer output ---\n${error.stdout}`);
  }
  throw error;
} finally {
  // Restore the repo's post-commit hook to its pre-test state.
  if (!hookExisted) {
    rmSync(hookPath, { force: true });
  } else if (hookBefore !== null) {
    writeFileSync(hookPath, hookBefore);
  }
  rmSync(e2eHome, { recursive: true, force: true });
}

console.log("  \u{2705} broken global shim: detected, warned, and bypassed via local binary (pi configured)");
