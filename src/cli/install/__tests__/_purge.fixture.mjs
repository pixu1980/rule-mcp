/**
 * uninstall --purge must delete the runtime home ~/.pix-galaxy-mcp/ (state,
 * projects, data, config — the layout src/cli/paths/index.js defines), and install
 * must recreate it on the next run.
 *
 * Regression: `./scripts/uninstall.sh --purge` only removed
 * ~/.config/pix-galaxy-mcp/ and left ~/.pix-galaxy-mcp/ (with the daemon SSE
 * token, telemetry, caches and per-project recordings) behind. Reinstalling
 * then started from stale state, and the "purge" promise — remove everything —
 * was silently broken.
 *
 * Contract guarded here (bash + PowerShell parity):
 *   1. install.sh recreates ~/.pix-galaxy-mcp/{state,data,projects,config};
 *   2. uninstall.sh --purge removes ~/.pix-galaxy-mcp/ along with
 *      ~/.config/pix-galaxy-mcp/ (--keep-config keeps both);
 *   3. install.ps1 / uninstall.ps1 do the same on Windows.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const root = new URL("../../../..", import.meta.url).pathname;

const readScript = (p) => readFileSync(join(root, p), "utf8");

export const installSh = readScript("scripts/install.sh");
export const uninstallSh = readScript("scripts/uninstall.sh");
export const installPs1 = readScript("scripts/install.ps1");
export const uninstallPs1 = readScript("scripts/uninstall.ps1");

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * A minimal hermetic PATH: /usr/bin + /bin so sed/find/grep/rm work, plus
 * node's own dir so any CLI fallback runs. No pix-galaxy-mcp, no pnpm — the
 * uninstall manual-cleanup path is what we are exercising.
 */
export function minimalPath() {
  return ["/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");
}

/** Create a fake HOME with ~/.pix-galaxy-mcp and ~/.config/pix-galaxy-mcp. */
export function seedHome() {
  const home = mkdtempSync(join(tmpdir(), "pix-purge-home-"));
  for (const dir of ["state", "projects", "data", "config"]) {
    mkdirSync(join(home, ".pix-galaxy-mcp", dir), { recursive: true });
  }
  writeFileSync(join(home, ".pix-galaxy-mcp", "state", "sse-token"), "test-token\n");
  mkdirSync(join(home, ".config", "pix-galaxy-mcp"), { recursive: true });
  writeFileSync(join(home, ".config", "pix-galaxy-mcp", "keys.json"), "{}");
  return home;
}

/** env without the runtime-relocation vars, so the real ~/.pix-galaxy-mcp is used. */
export function hermeticEnv(home, path) {
  const env = { ...process.env, HOME: home, PATH: path, PNPM_HOME: join(home, ".pnpm") };
  delete env.PIX_GALAXY_MCP_HOME;
  delete env.PIX_GALAXY_MCP_STATE_DIR;
  delete env.PIX_GALAXY_MCP_SKIP_GLOBAL_LINK;
  return env;
}

/** Run uninstall.sh with the given extra flags inside a seeded fake HOME. */
export function runUninstall(home, flags) {
  return execFileSync("bash", [join(root, "scripts", "uninstall.sh"), "--purge", "--force", ...flags], {
    // cwd outside the repo: uninstall's Phase 2 also cleans ./CLAUDE.md
    // project-level rules, and a repo checkout must not be mutated by tests.
    cwd: home,
    encoding: "utf8",
    env: hermeticEnv(home, minimalPath()),
    timeout: 120_000,
  });
}
