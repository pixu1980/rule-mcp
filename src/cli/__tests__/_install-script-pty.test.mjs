/**
 * macOS PTY acceptance test for the interactive installer.
 * The picker renders the full agent catalog and pre-selects detected agents:
 * the fake HOME only has Pi configured, so Pi starts checked. Confirm with
 * Enter, move to daemon with Down, confirm mode with Enter.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (process.platform !== "darwin" || !existsSync("/usr/bin/script")) {
  console.log("  ⏭️  PTY installer acceptance test requires macOS /usr/bin/script");
  process.exit(0);
}

const root = new URL("../../..", import.meta.url).pathname;
const fakeHome = mkdtempSync(join(tmpdir(), "rule-installer-pty-"));
mkdirSync(join(fakeHome, ".pi", "agent"), { recursive: true });
writeFileSync(join(fakeHome, ".pi", "agent", "mcp.json"), '{"mcpServers":{}}\n');

// Keystrokes: Enter (confirm the pre-selected Pi agent), Down (daemon mode),
// Enter (confirm mode), then n + Enter (decline the bundled skills step).
const output = execFileSync(
  "bash",
  [
    "-c",
    String.raw`printf '\r\033[B\rn\r' | HOME=${JSON.stringify(fakeHome)} PNPM_HOME=${JSON.stringify(join(fakeHome, ".pnpm"))} TERM=xterm /usr/bin/script -q /dev/null bash scripts/install.sh --dry-run --no-rules`,
  ],
  { cwd: root, encoding: "utf8" },
);

// Pi is detected (fake HOME) and therefore pre-selected: Enter confirms it.
assert.match(output, /Selected 1 agent\(s\): pi/);
assert.match(output, /Install mode: daemon/);
assert.match(output, /Would install daemon service/);
assert.match(output, /\[x\] 6 pi/, "detected agents must render pre-checked in the picker");

// Banner box alignment: every border/content row must span the same width.
const plain = output.replaceAll(/\x1B\[[0-9;?]*[a-zA-Z]/g, "");
const boxLines = plain
  .split(/\r*\n/)
  .map((l) => l.replaceAll("\r", "").trimEnd())
  .filter((l) => /^[╔║╚]/.test(l));
assert.ok(boxLines.length >= 4, "banner box must render");
const widths = new Set(boxLines.map((l) => l.length));
assert.equal(widths.size, 1, `banner box rows misaligned: widths ${[...widths].join(", ")}`);

// Step transition: the mode step must erase the agent picker and stand alone
// (parity with install.ps1 Select-ModeInteractive re-showing the banner).
assert.ok(output.includes("\x1B[6;1H\x1B[0J"), "mode step must erase the agent picker before rendering");
assert.match(plain, /Phase 3 - Install Mode/, "mode step must retitle the banner");
assert.match(plain, /Select install mode/, "mode step must carry its own title");
assert.match(plain, /Agents: 1 selected/, "mode step must summarize the confirmed agents");

// Skills step: the installer must ask before centralizing the catalog, and
// a No answer must skip cleanly (a silent yes would centralize 89 skills).
assert.match(plain, /Phase 6c: Bundled Skills/, "installer must have a bundled skills step");
assert.match(plain, /Install bundled rule-.*skills to ~\/\.agents\/skills\? \[y\/N\]/, "skills step must prompt with a [y/N] default-No choice");
assert.match(plain, /Skipping bundled skills/, "declining the skills step must skip cleanly");

console.log("  ✅ PTY installer pre-selects detected agents, handles arrows and Enter, asks about skills");
