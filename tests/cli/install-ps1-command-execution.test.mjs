/**
 * PowerShell command execution must not reparse a string through
 * Invoke-Expression, and must carry the same trust/shim contract as
 * scripts/install.sh:
 *   - the global binary is only trusted when it *launches* (Test-PixCli);
 *   - CLI errors are surfaced instead of swallowed;
 *   - uninstall.ps1 reverses the global shim/package completely.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const script = readFileSync("scripts/install.ps1", "utf8");
const uninstallScript = readFileSync("scripts/uninstall.ps1", "utf8");

// ── install.ps1: argv-safe execution (existing contract) ────────────────────
assert.match(script, /function Invoke-PixCli/);
assert.doesNotMatch(script, /Invoke-Expression "& \$BinCmd/);
assert.match(script, /Invoke-PixCli install --agent \$TargetAgent --mode \$InstallMode --json/);
assert.match(script, /Invoke-PixCli install --agent \$agent --mode \$InstallMode --json/);
assert.match(script, /Invoke-PixCli daemon install/);
assert.match(script, /Invoke-PixCli doctor/);

// ── install.ps1: shim verification before trust ─────────────────────────────
assert.match(script, /function Test-PixCli/, "installer must define a launch probe");
assert.match(script, /rule-mcp --version/, "the probe must actually launch the binary");
assert.match(script, /Global binary verified/, "installer must log the verified binary");
assert.match(script, /fails to launch - reinstalling/, "installer must repair a broken binary");
assert.match(script, /\$result = Invoke-PixCli install --agent \$TargetAgent --mode \$InstallMode --json 2>&1/, "target install must capture CLI output");
assert.match(script, /\$result \| ForEach-Object \{ Write-Host " {4}\$_" -ForegroundColor Gray \}/, "installer must surface CLI errors instead of swallowing them");
assert.match(script, /foreach \(\$agent in \$SelectedAgents\)/, "selected installs must still iterate");
assert.match(script, /Non-interactive run: configuring/, "installer must explain non-interactive behavior");
assert.match(script, /\$script:NoColor = \[Console\]::IsOutputRedirected/, "installer must gate colors behind redirection");
assert.match(script, /\$done = \$true/, "Enter must confirm via a flag (PS switch 'break' exits only the switch)");

// ── uninstall.ps1: full reversal of the global shim/package ─────────────────
assert.match(uninstallScript, /pnpm unlink --global rule-mcp/, "uninstaller must unlink the pnpm-linked package");
assert.match(uninstallScript, /npm uninstall -g rule-mcp/, "uninstaller must keep the npm uninstall fallback");
assert.match(uninstallScript, /rule-mcp\.cmd/, "uninstaller must remove Windows .cmd shims");
assert.match(uninstallScript, /APPDATA\\npm/, "uninstaller must check the npm global bin dir");
assert.match(uninstallScript, /\$script:NoColor = \[Console\]::IsOutputRedirected/, "uninstaller must gate colors the same way");
assert.match(uninstallScript, /agent config\(s\) currently reference rule-mcp/, "uninstaller confirmation must show a real count");

console.log("  ✅ PowerShell installer uses argv-safe CLI execution and the shim-heal contract");
