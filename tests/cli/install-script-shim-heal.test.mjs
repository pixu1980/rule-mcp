/**
 * install.sh ↔ uninstall.sh round-trip contract for the global shim and for
 * the terminal rendering gate.
 *
 * Regression: a `pnpm link --global` shim pins the repo's absolute path. After
 * the project moved (…/rule-mcp → …/ai/rule-mcp) the old shim
 * stayed on PATH but crashed on launch, so every `run_cli` call failed, the
 * stderr was swallowed (`>/dev/null 2>/dev/null`) and install.sh silently
 * marked pi as "skipped" — nothing was written to ~/.pi/agent/mcp.json.
 *
 * Contract guarded here:
 *   1. install.sh probes the shim with `--version`, warns + relinks when it is
 *      stale, and lets `run_cli` fall back to the local entrypoint instead of
 *      failing silently.
 *   2. install.sh surfaces CLI errors instead of swallowing them.
 *   3. uninstall.sh reverses the shim install: `pnpm unlink --global` + bin
 *      shim + global-store link removal.
 *   4. Colors/box-drawing are gated off when stdout is not a TTY.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const readScript = (p) => readFileSync(join(root, p), "utf8");
const installSh = readScript("scripts/install.sh");
const uninstallSh = readScript("scripts/uninstall.sh");

// ── Source contract ─────────────────────────────────────────────────────────

assert.match(installSh, /shim_works\(\) \{/, "install.sh must define a launch probe");
assert.match(installSh, /rule-mcp --version/, "the probe must actually launch the binary");
assert.match(installSh, /ensure_global_shim\(\) \{/, "install.sh must define ensure_global_shim");
assert.match(installSh, /RULE_MCP_SKIP_GLOBAL_LINK/, "install.sh must expose a link-skip escape hatch");
assert.doesNotMatch(
  installSh,
  /CI=true pnpm link --global/,
  "install.sh must NOT run `pnpm link --global` (pnpm 10/11 rewrites pnpm-workspace.yaml overrides)",
);
assert.match(installSh, /bin_dir\/rule-mcp/, "install.sh must write the shim directly into the global bin dir");
assert.match(installSh, /chmod \+x/, "install.sh must make the shim executable");
assert.match(
  installSh,
  /if shim_works; then\n {4}rule-mcp "\$@"/,
  "run_cli must prefer the shim only when it launches",
);
assert.match(installSh, /node "\$LOCAL_BIN" "\$@"/, "run_cli must keep the local-binary fallback");
assert.doesNotMatch(
  installSh,
  /run_cli install --agent "\$\{TARGET_AGENT\}" --mode "\$\{INSTALL_MODE\}" --json >\/dev\/null/,
  "install.sh must not swallow a failed CLI install",
);
assert.match(installSh, /out="\$\(run_cli install --agent "\$\{TARGET_AGENT\}"/, "install.sh must capture CLI errors");
assert.match(installSh, /USE_COLOR=false/, "install.sh must gate colors behind a TTY/NO_COLOR check");
assert.match(installSh, /\[\[ -t 1 \]\]/, "install.sh must check stdout is a TTY before coloring");

assert.match(uninstallSh, /pnpm unlink --global rule-mcp/, "uninstall.sh must unlink the pnpm-linked package");
assert.match(uninstallSh, /Library\/pnpm\/bin\/rule-mcp/, "uninstall.sh must remove the pnpm bin shim");
assert.match(
  uninstallSh,
  /global\/"\*\/node_modules\/rule-mcp/,
  "uninstall.sh must remove the link from the global store",
);
assert.match(uninstallSh, /USE_COLOR=false/, "uninstall.sh must gate colors the same way");

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract a `name() { ... }` bash function (brace-balanced) from script source. */
function extractBashFunction(source, name) {
  const start = source.indexOf(`${name}() {`);
  if (start === -1) {
    return null;
  }
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") {
      depth++;
    } else if (source[index] === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  return null;
}

// ── Behavioral: real functions extracted from install.sh ────────────────────

const shimWorks = extractBashFunction(installSh, "shim_works");
const shimPath = extractBashFunction(installSh, "shim_path");
const ensureGlobalShim = extractBashFunction(installSh, "ensure_global_shim");
const runCli = extractBashFunction(installSh, "run_cli");
assert.ok(shimWorks && shimPath && ensureGlobalShim && runCli, "must extract shim functions from install.sh");

const fakeHome = mkdtempSync(join(tmpdir(), "rule-shim-heal-"));
const fakeBin = join(fakeHome, "bin");
mkdirSync(fakeBin, { recursive: true });
// A stale shim: resolves with `command -v`, but crashes on launch.
writeFileSync(join(fakeBin, "rule-mcp"), "#!/bin/sh\nexit 3\n", { mode: 0o755 });
// A pnpm stub: enough to satisfy `command -v pnpm` inside ensure_global_shim.
writeFileSync(join(fakeBin, "pnpm"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });

const localBin = join(root, "bin", "rule-mcp.js");
const harness = String.raw`#!/usr/bin/env bash
set -euo pipefail
info()  { :; }
ok()    { :; }
warn()  { echo "WARN: $1"; }
fail()  { echo "FAIL: $1"; }
header(){ :; }
sub()   { echo "$1"; }
IS_LOCAL_REPO=true
LOCAL_BIN="${localBin}"
RULE_MCP_SKIP_GLOBAL_LINK=1
PATH="${fakeBin}:${process.env.PATH}"
export PATH
${shimWorks}
${shimPath}
${ensureGlobalShim}
${runCli}
if shim_works; then echo 'probe=yes'; else echo 'probe=no'; fi
ensure_global_shim
out="$(run_cli --version 2>&1)" && rc=0 || rc=$?
printf 'run_cli_rc=%s\n' "$rc"
printf 'run_cli_out=%s\n' "$out"
`;
const harnessFile = join(mkdtempSync(join(tmpdir(), "rule-shim-harness-")), "harness.sh");
writeFileSync(harnessFile, harness);
let harnessOut;
try {
  harnessOut = execFileSync("bash", [harnessFile], { encoding: "utf8", timeout: 30_000 });
} finally {
  rmSync(harnessFile, { force: true });
  rmSync(fakeHome, { recursive: true, force: true });
}

assert.match(harnessOut, /probe=no/, "a broken shim must fail the launch probe");
assert.match(
  harnessOut,
  /WARN: Global rule-mcp shim exists but fails to launch/,
  "install.sh must warn on a stale shim",
);
assert.match(harnessOut, /run_cli_rc=0/, "run_cli must fall back to the local binary when the shim is broken");
assert.match(harnessOut, /run_cli_out=1\.0\.0/, "the fallback must actually run the CLI");

// ── End-to-end: broken shim must not cause a silent "skipped" install ──────

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

console.log("  ✅ broken global shim: detected, warned, and bypassed via local binary (pi configured)");
console.log("  ✅ uninstall.sh reverses the shim: pnpm unlink + bin shim + store link");
