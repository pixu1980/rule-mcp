/**
 * A seeded fake HOME and a hermetic environment for running the uninstall
 * bootstrap end to end.
 *
 * The bootstrap resolves the global bin directory from PNPM_HOME, so a run
 * that inherits the developer's real one rewrites or deletes their actual
 * shim. Every helper here names it explicitly.
 *
 * Fixture file: exempt from the size cap.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const root = new URL("../../../..", import.meta.url).pathname;

/**
 * A minimal hermetic PATH: the running node (the bootstrap refuses to start
 * without it) plus the system directories. No rule-mcp, no pnpm, so
 * the local-binary path is what gets exercised.
 */
export function minimalPath() {
  return [dirname(process.execPath), "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");
}

/** Create a fake HOME with ~/.rule-mcp and ~/.config/rule-mcp. */
export function seedHome() {
  const home = mkdtempSync(join(tmpdir(), "rule-purge-home-"));

  for (const dir of ["state", "projects", "data", "config"]) {
    mkdirSync(join(home, ".rule-mcp", dir), { recursive: true });
  }

  writeFileSync(join(home, ".rule-mcp", "state", "sse-token"), "test-token\n");
  mkdirSync(join(home, ".config", "rule-mcp"), { recursive: true });
  writeFileSync(join(home, ".config", "rule-mcp", "keys.json"), "{}");

  return home;
}

/** env without the relocation vars, so the fake HOME's real layout is used. */
export function hermeticEnv(home, path) {
  const env = { ...process.env, HOME: home, PATH: path ?? minimalPath(), PNPM_HOME: join(home, ".pnpm") };

  delete env.RULE_MCP_HOME;
  delete env.RULE_MCP_STATE_DIR;
  delete env.RULE_MCP_SKIP_GLOBAL_LINK;

  return env;
}

/** Run the uninstall bootstrap with --purge inside a seeded fake HOME. */
export function runUninstall(home, flags) {
  return execFileSync("bash", [join(root, "scripts", "uninstall.sh"), "--purge", "--force", ...flags], {
    // cwd outside the repo: the run also cleans ./CLAUDE.md project rules,
    // and a repo checkout must not be mutated by a test.
    cwd: home,
    encoding: "utf8",
    env: hermeticEnv(home),
    timeout: 120_000,
  });
}
