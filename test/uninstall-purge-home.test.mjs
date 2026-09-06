/**
 * uninstall --purge must delete the runtime home ~/.rule-mcp/ (state,
 * projects, data, config — the layout src/cli/paths.js defines), and install
 * must recreate it on the next run.
 *
 * Regression: `./scripts/uninstall.sh --purge` only removed
 * ~/.config/rule-mcp/ and left ~/.rule-mcp/ (with the daemon SSE
 * token, telemetry, caches and per-project recordings) behind. Reinstalling
 * then started from stale state, and the "purge" promise — remove everything —
 * was silently broken.
 *
 * Contract guarded here (bash + PowerShell parity):
 *   1. install.sh recreates ~/.rule-mcp/{state,data,projects,config};
 *   2. uninstall.sh --purge removes ~/.rule-mcp/ along with
 *      ~/.config/rule-mcp/ (--keep-config keeps both);
 *   3. install.ps1 / uninstall.ps1 do the same on Windows.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const readScript = (p) => readFileSync(join(root, p), "utf8");
const installSh = readScript("scripts/install.sh");
const uninstallSh = readScript("scripts/uninstall.sh");
const installPs1 = readScript("scripts/install.ps1");
const uninstallPs1 = readScript("scripts/uninstall.ps1");

// ── 1. install.sh must recreate the runtime home explicitly ────────────────
assert.match(
  installSh,
  /RULE_MCP_HOME_DIR="\$HOME_DIR\/\.rule-mcp"/,
  "install.sh must define the runtime home path (~/.rule-mcp)",
);
assert.match(
  installSh,
  /mkdir -p "\$RULE_MCP_HOME_DIR\/state" "\$RULE_MCP_HOME_DIR\/data" "\$RULE_MCP_HOME_DIR\/projects" "\$RULE_MCP_HOME_DIR\/config"/,
  "install.sh must recreate state/, data/, projects/, config/ under ~/.rule-mcp",
);

// ── 2. uninstall.sh --purge must remove ~/.rule-mcp/ ─────────────────
assert.match(
  uninstallSh,
  /RULE_MCP_HOME_DIR="\$HOME_DIR\/\.rule-mcp"/,
  "uninstall.sh must define the runtime home path (~/.rule-mcp)",
);
assert.match(
  uninstallSh,
  /rm -rf "\$RULE_MCP_HOME_DIR"/,
  "uninstall.sh --purge must delete the whole ~/.rule-mcp/ directory",
);
assert.match(
  uninstallSh,
  /KEEP_CONFIG.*== "true"[\s\S]*?Keeping runtime home/,
  "uninstall.sh --keep-config must keep the runtime home",
);
assert.match(
  uninstallSh,
  /Also delete ~\/\.config\/rule-mcp\/, ~\/\.rule-mcp\/ and API keys/,
  "uninstall.sh --help must advertise both directories under --purge",
);

// ── 3. PowerShell parity ────────────────────────────────────────────────────
assert.match(
  installPs1,
  /New-Item -ItemType Directory -Force.*\$pixHomeDir/s,
  "install.ps1 must recreate the runtime home directory",
);
assert.match(
  uninstallPs1,
  /\$pixHomeDir = Join-Path \$HomeDir "\.rule-mcp"/,
  "uninstall.ps1 must define the runtime home path",
);
assert.match(
  uninstallPs1,
  /Remove-Item \$pixHomeDir -Recurse -Force/,
  "uninstall.ps1 -Purge must delete the whole ~/.rule-mcp/ directory",
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * A minimal hermetic PATH: /usr/bin + /bin so sed/find/grep/rm work, plus
 * node's own dir so any CLI fallback runs. No rule-mcp, no pnpm — the
 * uninstall manual-cleanup path is what we are exercising.
 */
function minimalPath() {
  return ["/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");
}

/** Create a fake HOME with ~/.rule-mcp and ~/.config/rule-mcp. */
function seedHome() {
  const home = mkdtempSync(join(tmpdir(), "rule-purge-home-"));
  for (const dir of ["state", "projects", "data", "config"]) {
    mkdirSync(join(home, ".rule-mcp", dir), { recursive: true });
  }
  writeFileSync(join(home, ".rule-mcp", "state", "sse-token"), "test-token\n");
  mkdirSync(join(home, ".config", "rule-mcp"), { recursive: true });
  writeFileSync(join(home, ".config", "rule-mcp", "keys.json"), "{}");
  return home;
}

/** env without the runtime-relocation vars, so the real ~/.rule-mcp is used. */
function hermeticEnv(home, path) {
  const env = { ...process.env, HOME: home, PATH: path };
  delete env.RULE_MCP_HOME;
  delete env.RULE_MCP_STATE_DIR;
  delete env.RULE_MCP_SKIP_GLOBAL_LINK;
  return env;
}

// ── Behavioral: uninstall.sh --purge / --keep-config in a fake HOME ────────

// --purge alone: both ~/.config/rule-mcp AND ~/.rule-mcp go away.
{
  const home = seedHome();
  try {
    const output = execFileSync("bash", [join(root, "scripts", "uninstall.sh"), "--purge", "--force"], {
      // cwd outside the repo: uninstall's Phase 2 also cleans ./CLAUDE.md
      // project-level rules, and a repo checkout must not be mutated by tests.
      cwd: home,
      encoding: "utf8",
      env: hermeticEnv(home, minimalPath()),
      timeout: 120_000,
    });
    assert.match(output, /Runtime home deleted/, "uninstall.sh --purge must report the runtime home deletion");
    assert.doesNotMatch(output, /No runtime home found/, "the runtime home must have been found, not skipped");
    assert.ok(!existsSync(join(home, ".rule-mcp")), "--purge must delete ~/.rule-mcp/");
    assert.ok(
      !existsSync(join(home, ".config", "rule-mcp")),
      "--purge must also delete ~/.config/rule-mcp/",
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

// --purge --keep-config: both config/runtime directories survive.
{
  const home = seedHome();
  try {
    execFileSync(
      "bash",
      [join(root, "scripts", "uninstall.sh"), "--purge", "--force", "--keep-config"],
      // cwd outside the repo (see the --purge block above).
      { cwd: home, encoding: "utf8", env: hermeticEnv(home, minimalPath()), timeout: 120_000 },
    );
    assert.ok(existsSync(join(home, ".rule-mcp")), "--keep-config must keep the runtime home");
    assert.ok(existsSync(join(home, ".config", "rule-mcp")), "--keep-config must keep ~/.config/rule-mcp/");
    assert.ok(
      existsSync(join(home, ".rule-mcp", "state", "sse-token")),
      "--keep-config must keep the SSE token untouched",
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

// ── Behavioral: install.sh recreates the runtime home after a purge ────────

{
  const home = mkdtempSync(join(tmpdir(), "rule-purge-reinstall-"));
  mkdirSync(join(home, ".pi", "agent"), { recursive: true });
  writeFileSync(join(home, ".pi", "agent", "mcp.json"), '{"mcpServers":{}}\n');
  // Symlink-free local-binary install path: install.sh resolves the CLI from
  // the repo (bin/rule-mcp.js) and RULE_MCP_SKIP_GLOBAL_LINK=1
  // skips the global shim entirely, keeping the e2e hermetic.
  const path = [
    dirname(process.execPath),
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ].join(":");
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
    assert.match(output, /Runtime home ready/, "install.sh must report the runtime home creation");
    assert.ok(existsSync(join(home, ".rule-mcp")), "install.sh must recreate ~/.rule-mcp/");
    assert.ok(existsSync(join(home, ".rule-mcp", "state")), "install.sh must recreate state/");
    assert.ok(existsSync(join(home, ".pi", "agent", "mcp.json")), "pi must still be configured by the install");
  } catch (error) {
    if (error.stdout) {
      console.error(`\n--- captured installer output ---\n${error.stdout}`);
    }
    throw error;
  } finally {
    if (!hookExisted) {
      rmSync(hookPath, { force: true });
    } else if (hookBefore !== null) {
      writeFileSync(hookPath, hookBefore);
    }
    rmSync(home, { recursive: true, force: true });
  }
}

console.log(
  "  ✅ uninstall --purge removes ~/.rule-mcp/ (+ ~/.config/rule-mcp/), --keep-config keeps both",
);
console.log("  ✅ install.sh (and install.ps1) explicitly recreate ~/.rule-mcp/{state,data,projects,config}");
