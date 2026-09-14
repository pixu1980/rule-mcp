/**
 * PTY acceptance: a terminal gets the wizard, and the wizard can be left.
 *
 * The bootstrap forwards to `rule-mcp setup` (ADR 080), which draws the
 * full-screen wizard when there is a terminal to draw on. Under a pipe every
 * other test sees the plain runner, so this is the only place the Ink half is
 * exercised end to end: the frame renders, the rail is there, and `q` leaves
 * without writing anything.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const usable = process.platform === "darwin" && existsSync("/usr/bin/script");

test("a terminal gets the wizard, and q leaves it", { skip: usable ? false : "needs macOS /usr/bin/script" }, () => {
  const root = new URL("../../..", import.meta.url).pathname;
  const home = mkdtempSync(join(tmpdir(), "rule-installer-pty-"));

  mkdirSync(join(home, ".pi", "agent"), { recursive: true });
  writeFileSync(join(home, ".pi", "agent", "mcp.json"), '{"mcpServers":{}}\n');

  try {
    // The keystroke waits for the frame: Ink puts the terminal in raw mode on
    // mount, and a `q` sent before that is a `q` nobody reads. It is sent
    // repeatedly because "when the frame is up" is a race under a loaded test
    // runner, and a missed keystroke is a wizard nobody is there to close.
    const output = execFileSync(
      "bash",
      [
        "-c",
        `(sleep 2; for _ in 1 2 3 4 5 6 7 8 9 10; do printf 'q'; sleep 1; done) | HOME=${JSON.stringify(home)} PNPM_HOME=${JSON.stringify(join(home, ".pnpm"))} RULE_MCP_SKIP_GLOBAL_LINK=1 TERM=xterm /usr/bin/script -q /dev/null bash scripts/install.sh --dry-run --no-rules`,
      ],
      { cwd: root, encoding: "utf8", timeout: 60_000, killSignal: "SIGKILL" },
    );
    const esc = String.fromCodePoint(27);
    const plain = output.replaceAll(new RegExp(String.raw`${esc}\[[0-9;?]*[a-zA-Z]`, "g"), "").replaceAll("\r", "");

    // The rail wraps at the pty's width, so the labels are asserted where they
    // are data (`_steps.data.js`) and the frame is asserted here.
    assert.match(plain, /Setup/, "the frame must render its title");
    assert.match(plain, /dry run/, "the frame must say a dry run is a dry run");
    assert.match(plain, /Environment/, "the preflight step must render its checks");
    assert.match(plain, /Press Enter to choose which agents/, "the wizard must be waiting for a keystroke");
    assert.match(plain, /q quit/, "the key bar must say how to leave");
    assert.match(plain, /Nothing was written/, "leaving a dry run must report that nothing happened");

    assert.ok(!existsSync(join(home, ".rule-mcp")), "quitting the wizard must write nothing");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
