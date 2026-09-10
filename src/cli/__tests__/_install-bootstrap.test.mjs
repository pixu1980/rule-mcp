

/**
 * The shell bootstraps are bootstraps, and nothing more.
 *
 * install.sh and uninstall.sh used to be 2100 lines that re-implemented the
 * agent catalog, the picker and the install phases in bash. That second
 * implementation drifted from the Node one (ADR 080) - install.sh wrote
 * `~/.cursorrules` while uninstall.sh cleaned `~/.cursor/.cursorrules`, and
 * the two agent matrices diverged. These tests keep the scripts from growing
 * logic back.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const read = (name) => readFileSync(join(root, "scripts", name), "utf8");

/** A sandbox HOME with one detected agent, so a run has something to do. */
function sandbox(prefix) {
  const home = mkdtempSync(join(tmpdir(), prefix));

  return {
    ...process.env,
    HOME: home,
    // Never let a test write or delete the developer's real global shim.
    PNPM_HOME: join(home, ".pnpm"),
    RULE_MCP_HOME: join(home, ".rule-mcp"),
    RULE_MCP_SKIP_GLOBAL_LINK: "1",
    TERM: "dumb",
  };
}

const run = (script, args, prefix) => execFileSync("bash", [join("scripts", script), ...args], { cwd: root, encoding: "utf8", env: sandbox(prefix) });

for (const name of ["install.sh", "uninstall.sh"]) {
  test(`${name} stays a bootstrap`, () => {
    const source = read(name);
    const lines = source.split("\n").length;

    assert.ok(lines < 120, `${name} is ${lines} lines - logic belongs in src/cli/setup/, not here`);
    assert.match(source, /rule-mcp setup/, "the bootstrap must hand over to the setup wizard");
  });

  test(`${name} refuses a Node it cannot run on`, () => {
    const source = read(name);

    assert.match(source, /NODE_MIN=20/, "the floor must match the package engines field");
    assert.match(source, /process\.versions\.node/, "the check must read the running Node version");
  });

  test(`${name} keeps no agent catalog of its own`, () => {
    const source = read(name);

    // The bash matrices are what drifted. One catalog, in Node.
    assert.doesNotMatch(source, /AGENT_NAMES=/, "the agent list lives in src/cli/installers/_catalog.js");
    assert.doesNotMatch(source, /mcp\.json/, "config paths live in src/cli/installers/_paths.js");
    assert.doesNotMatch(source, /cursorrules/, "instruction file paths live in src/cli/setup/_rules-apply.js");
  });
}

test("a piped run stays non-interactive so it cannot hang", () => {
  const source = read("install.sh");

  // Borrowing /dev/tty is what gives `curl | bash` a real wizard. Gating it
  // on stdout also being a terminal is what stops a scripted run - stdout
  // redirected to a pipe - from blocking on a keystroke nobody will send.
  assert.match(source, /\[ ! -t 0 \] && \[ -t 1 \]/, "the tty handoff must require an interactive stdout");
});

test("install.sh forwards the target agent and mode to the plan", () => {
  const output = run("install.sh", ["--agent", "pi", "--mode", "daemon", "--dry-run", "--no-rules"], "rule-bootstrap-install-");

  assert.match(output, /dry run/, "a dry run must announce itself");
  assert.match(output, /Configure pi/, "the requested agent must appear as its own step");
  assert.doesNotMatch(output, /Configure cursor|Configure vscode/, "no agent beyond the requested one may be configured");
  assert.doesNotMatch(output, /Instruction files/, "--no-rules must drop the instruction step");
});

test("uninstall.sh translates --force into a non-interactive run", () => {
  const source = read("uninstall.sh");

  assert.match(source, /--no-interactive/, "--force must keep meaning 'do not ask'");

  const output = run("uninstall.sh", ["--force", "--dry-run"], "rule-bootstrap-uninstall-");

  assert.match(output, /uninstall \(dry run\)/, "the uninstall direction must be selected");
});
