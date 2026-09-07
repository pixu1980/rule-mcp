/**
 * PowerShell parity contract. pwsh is not available in this environment, so
 * this checks the executable script structure and runs syntax validation when
 * pwsh exists in CI.
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const script = readFileSync("scripts/install.ps1", "utf8");

assert.match(script, /\[string\]\$Mode\s*=\s*""/, "PowerShell installer must accept an explicit mode");
assert.match(script, /@\('stdio','daemon','docker'\)/, "PowerShell chooser must use daemon, not a message-only sse mode");
assert.match(script, /install --agent \$TargetAgent --mode \$InstallMode --json/, "target install must forward mode");
assert.match(script, /install --agent \$agent --mode \$InstallMode --json/, "selected installs must forward mode");
assert.doesNotMatch(script, /Phase 4: IDE Integration/, "must not auto-configure IDEs outside selected agents");
assert.doesNotMatch(script, /JetBrains configured \(\.idea\\mcp\.json\)/, "must not create JetBrains config without selection");
assert.match(script, /if \(\$InstallMode -eq 'daemon'\) \{\s*Write-Header "Phase 6: Windows Service"/, "Windows service phase must run only in daemon mode");

// Windsurf is gone from the Windows installer; Devin (formerly Windsurf)
// takes its place with the documented mcp_config.json path.
assert.doesNotMatch(script, /\bwindsurf\b/, "the Windows installer must not offer windsurf");
assert.match(script, /"devin"\s*=\s*"\$HomeDir\\.config\\devin\\mcp_config\.json"/, "the Windows installer must probe Devin's mcp_config.json");
assert.match(script, /Devin \(formerly Windsurf\)/, "the Windows picker must brand Devin with its Windsurf heritage");

// Flicker guard: the Windows picker redraws changed rows in place with
// SetCursorPosition instead of Clear-Host + full re-render per keystroke.
assert.match(script, /\[Console\]::SetCursorPosition\(0, \$y\)/, "the Windows picker must use cursor-addressed row redraw (no flicker)");
const readStart = script.indexOf("$key = [Console]::ReadKey($true)");
const readEnd = script.indexOf("if ($done) { break }", readStart);
const pickerLoop = readStart !== -1 && readEnd !== -1 ? script.slice(readStart, readEnd) : "";
assert.ok(pickerLoop, "the picker must contain a ReadKey loop");
assert.ok(pickerLoop.includes("Render-") && !pickerLoop.includes("Clear-Host"), "the picker loop must rewrite rows in place and never Clear-Host per key");

if (existsSync("/usr/local/bin/pwsh") || existsSync("/opt/homebrew/bin/pwsh")) {
  execFileSync(
    "pwsh",
    [
      "-NoProfile",
      "-Command",
      "$errors=$null; [System.Management.Automation.Language.Parser]::ParseFile('scripts/install.ps1',[ref]$null,[ref]$errors)|Out-Null; if($errors.Count){$errors|%{Write-Error $_}; exit 1}",
    ],
    { stdio: "inherit" },
  );
}

console.log("  ✅ PowerShell installer keeps selected mode and agents only");
