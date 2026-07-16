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
assert.match(
  script,
  /@\('stdio','daemon','docker'\)/,
  "PowerShell chooser must use daemon, not a message-only sse mode",
);
assert.match(script, /install --agent \$TargetAgent --mode \$InstallMode --json/, "target install must forward mode");
assert.match(script, /install --agent \$agent --mode \$InstallMode --json/, "selected installs must forward mode");
assert.doesNotMatch(script, /Phase 4: IDE Integration/, "must not auto-configure IDEs outside selected agents");
assert.doesNotMatch(
  script,
  /JetBrains configured \(\.idea\\mcp\.json\)/,
  "must not create JetBrains config without selection",
);
assert.match(
  script,
  /if \(\$InstallMode -eq 'daemon'\) \{\s*Write-Header "Phase 6: Windows Service"/,
  "Windows service phase must run only in daemon mode",
);

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
