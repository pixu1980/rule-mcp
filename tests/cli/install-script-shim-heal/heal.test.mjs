/** Behavioral: the real shim functions extracted from install.sh, run against a broken shim. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { extractBashFunction, installSh, root } from "./_shim.fixture.mjs";

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
export PATH="${fakeBin}:${process.env.PATH}" PNPM_HOME="${fakeHome}/.pnpm"
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

console.log("  \u{2705} broken shim: probe fails, warn fires, run_cli falls back to the local binary");
