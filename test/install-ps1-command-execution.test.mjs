/** PowerShell command execution must not reparse a string through Invoke-Expression. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const script = readFileSync("scripts/install.ps1", "utf8");
assert.match(script, /function Invoke-PixCli/);
assert.doesNotMatch(script, /Invoke-Expression "& \$BinCmd/);
assert.match(script, /Invoke-PixCli install --agent \$TargetAgent --mode \$InstallMode --json/);
assert.match(script, /Invoke-PixCli install --agent \$agent --mode \$InstallMode --json/);
assert.match(script, /Invoke-PixCli daemon install/);
assert.match(script, /Invoke-PixCli doctor/);

console.log("  ✅ PowerShell installer uses argv-safe CLI execution");
