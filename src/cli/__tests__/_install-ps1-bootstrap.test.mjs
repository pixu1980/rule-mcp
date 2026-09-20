

/**
 * The Windows bootstraps carry the same contract as the POSIX pair.
 *
 * There used to be three implementations of the install logic - bash,
 * PowerShell, and Node - and the PowerShell one drifted furthest because it
 * was the least exercised (ADR 080). Now it only has to find Node and hand
 * over, and these tests keep it that way. pwsh is optional here; when it is
 * present the scripts are also parsed for real.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const read = (name) => readFileSync(join(root, "scripts", name), "utf8");

/** pwsh is not installed everywhere; skip the parse when it is missing. */
function pwshAvailable() {
  try {
    execFileSync("pwsh", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.Major"], { stdio: "pipe" });

    return true;
  } catch {
    return false;
  }
}

for (const name of ["install.ps1", "uninstall.ps1"]) {
  test(`${name} stays a bootstrap`, () => {
    const source = read(name);
    const lines = source.split("\n").length;

    assert.ok(lines < 120, `${name} is ${lines} lines - logic belongs in src/cli/setup/, not here`);
    assert.match(source, /setup/, "the bootstrap must hand over to the setup wizard");
    assert.match(source, /nodeMin = 20/, "the Node floor must match NODE_MIN in src/cli/setup/_preflight.js");
  });

  test(`${name} keeps no agent catalog or picker of its own`, () => {
    const source = read(name);

    assert.doesNotMatch(source, /mcp\.json/, "config paths live in src/cli/installers/_paths.js");
    assert.doesNotMatch(source, /ReadKey/, "the picker lives in src/cli/setup/, rendered by Ink");
    assert.doesNotMatch(source, /SetCursorPosition/, "no hand-rolled cursor addressing survives the rework");
    assert.doesNotMatch(source, /\bwindsurf\b/i, "windsurf was renamed Devin and lives in the Node catalog");
  });
}

test("uninstall.ps1 keeps --force meaning 'do not ask'", () => {
  assert.match(read("uninstall.ps1"), /'--no-interactive'/, "--force must translate to a non-interactive run");
});

test("both PowerShell bootstraps parse", { skip: !pwshAvailable() && "pwsh is not installed" }, () => {
  for (const name of ["install.ps1", "uninstall.ps1"]) {
    execFileSync(
      "pwsh",
      [
        "-NoProfile",
        "-Command",
        `$errors=$null; [System.Management.Automation.Language.Parser]::ParseFile('scripts/${name}',[ref]$null,[ref]$errors)|Out-Null; if($errors.Count){$errors|%{Write-Error $_}; exit 1}`,
      ],
      { cwd: root, stdio: "pipe" },
    );
  }
});
