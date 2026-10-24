/**
 * The four bootstraps do the same three things, and nothing else.
 *
 * `scripts/install.{sh,ps1}` and `scripts/uninstall.{sh,ps1}` used to be a
 * second installer: agent detection, pickers, modes, instruction files, the
 * daemon service. They are bootstraps now (ADR 090) - check node, resolve the
 * binary, forward to `rule-mcp setup` - and the contract worth asserting
 * is that they stay that way. Parity is the point: a question one platform
 * asks and the other does not is how the two drifted the first time.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (name) => readFileSync(`scripts/${name}`, "utf8");
const POSIX = ["install.sh", "uninstall.sh"];
const WINDOWS = ["install.ps1", "uninstall.ps1"];

test("every bootstrap hands the arguments to the wizard", () => {
  for (const name of [...POSIX, ...WINDOWS]) {
    const script = read(name);
    const direction = name.startsWith("uninstall") ? /setup (--uninstall |@?\$?forwarded)/ : /setup/;

    assert.match(script, direction, `${name} must call setup`);
    assert.match(script, /pnpm dlx rule-mcp setup/, `${name} must be able to fetch the binary`);
    assert.match(script, /npx --yes rule-mcp setup/, `${name} must keep the npx fallback`);
  }
});

test("the binary is resolved, in the same order, before it is trusted", () => {
  for (const name of POSIX) {
    const script = read(name);

    assert.match(script, /if \[ -f "\$local_bin" \]/, `${name} must prefer the checkout it came from`);
    assert.match(script, /command -v rule-mcp >\/dev\/null 2>&1 && rule-mcp --version/, `${name} must verify the global shim launches, not just that it resolves`);
  }

  for (const name of WINDOWS) {
    const script = read(name);

    assert.match(script, /if \(Test-Path \$localBin\)/, `${name} must prefer the checkout it came from`);
    assert.match(script, /& rule-mcp --version \*> \$null/, `${name} must verify the global shim launches`);
  }
});

test("no bootstrap reparses a command string", () => {
  for (const name of POSIX) {
    assert.doesNotMatch(read(name), /\beval\b/, `${name} must not eval a command string`);
  }

  for (const name of WINDOWS) {
    assert.doesNotMatch(read(name), /Invoke-Expression/, `${name} must not use Invoke-Expression`);
  }
});

test("a piped run still gets the wizard when a terminal is there to draw on", () => {
  // `curl ... | bash` leaves stdin holding the script while stdout is still
  // the terminal. A scripted run redirects both, and must stay non-interactive.
  for (const name of POSIX) {
    assert.match(read(name), /if \[ ! -t 0 \] && \[ -t 1 \]/, `${name} must tell the two piped cases apart`);
  }
});

test("node is checked before anything else runs", () => {
  for (const name of POSIX) {
    assert.match(read(name), /NODE_MIN=20/, `${name} must state the node floor`);
  }

  for (const name of WINDOWS) {
    assert.match(read(name), /\$nodeMin = 20/, `${name} must state the node floor`);
  }
});

test("the scripts parse", () => {
  for (const name of POSIX) {
    execFileSync("bash", ["-n", `scripts/${name}`], { stdio: "pipe" });
  }

  if (!existsSync("/usr/local/bin/pwsh") && !existsSync("/opt/homebrew/bin/pwsh")) {
    return;
  }

  for (const name of WINDOWS) {
    execFileSync(
      "pwsh",
      [
        "-NoProfile",
        "-Command",
        `$errors=$null; [System.Management.Automation.Language.Parser]::ParseFile('scripts/${name}',[ref]$null,[ref]$errors)|Out-Null; if($errors.Count){$errors|%{Write-Error $_}; exit 1}`,
      ],
      { stdio: "inherit" },
    );
  }
});
