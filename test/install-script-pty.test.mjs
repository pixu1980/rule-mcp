/**
 * macOS PTY acceptance test for the interactive installer.
 * Select Pi with Space, choose daemon with Down, then confirm with Enter.
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

const root = new URL("..", import.meta.url).pathname;
const fakeHome = mkdtempSync(join(tmpdir(), "rule-installer-pty-"));
mkdirSync(join(fakeHome, ".pi", "agent"), { recursive: true });
writeFileSync(join(fakeHome, ".pi", "agent", "mcp.json"), '{"mcpServers":{}}\n');

const output = execFileSync(
  "bash",
  [
    "-c",
    String.raw`printf ' \r\033[B\r' | HOME=${JSON.stringify(fakeHome)} TERM=xterm /usr/bin/script -q /dev/null bash scripts/install.sh --dry-run --no-rules`,
  ],
  { cwd: root, encoding: "utf8" },
);

assert.match(output, /Selected 1 agent\(s\): pi/);
assert.match(output, /Install mode: daemon/);
assert.match(output, /Would install daemon service/);

console.log("  ✅ PTY installer handles Space, arrows, and Enter");
