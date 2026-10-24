/**
 * End-to-end: the bootstrap reaches the wizard, and a broken shim does not
 * cost the install.
 *
 * `scripts/install.sh` checks node, resolves the binary and forwards every
 * argument to `rule-mcp setup` (ADR 090). Piped, with `--no-wizard`,
 * that is the plain runner over the same plan - so this is the one test that
 * proves the shell half and the node half still meet.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

test("install.sh --no-wizard configures the agent even with a broken shim on PATH", () => {
  const home = mkdtempSync(join(tmpdir(), "rule-mcp-setup-e2e-"));
  const bin = join(home, "bin");

  mkdirSync(join(home, ".pi", "agent"), { recursive: true });
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(home, ".pi", "agent", "mcp.json"), '{"mcpServers":{}}\n');
  // Resolves with `command -v`, crashes on launch: the shape that used to
  // make an install report success and configure nothing.
  writeFileSync(join(bin, "rule-mcp"), "#!/bin/sh\nexit 3\n");
  chmodSync(join(bin, "rule-mcp"), 0o755);

  try {
    const output = execFileSync("bash", [join(root, "scripts", "install.sh"), "--agent", "pi", "--mode", "stdio", "--no-wizard", "--no-rules", "--no-commands", "--no-doctor"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        PATH: [bin, dirname(process.execPath), "/usr/bin", "/bin"].join(":"),
        // Never the real one: the plan writes here.
        PNPM_HOME: join(home, ".pnpm"),
        RULE_MCP_SKIP_GLOBAL_LINK: "1",
      },
      timeout: 120_000,
    });

    assert.match(output, /Configure pi/, "the plan must name the agent step");

    const mcp = JSON.parse(readFileSync(join(home, ".pi", "agent", "mcp.json"), "utf8"));

    assert.ok(mcp.mcpServers["rule-mcp"], "pi mcp.json must contain the server entry");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
