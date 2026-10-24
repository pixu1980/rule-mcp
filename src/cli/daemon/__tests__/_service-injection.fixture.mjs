

/**
 * Drive the three daemon adapters against a HOME whose name carries shell
 * metacharacters, with stubbed service binaries that record their argv.
 *
 * A shell that interpolated the plist or unit path would run the `$(...)` in
 * it; an argv array hands the whole string to the program instead. The child
 * prints the recorded argv as JSON and the parent asserts on it.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = mkdtempSync(join(tmpdir(), "rule-mcp-inject-"));
const meta = '$(touch INJECTED);"quoted" spaced';
const home = join(base, meta);
const argvLog = join(base, "argv.log");
const binDir = join(base, "stub-bin");

mkdirSync(home, { recursive: true });
process.env.HOME = home;
process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-inject-state-"));
process.chdir(home);

mkdirSync(binDir, { recursive: true });

/** A stub that appends each of its arguments on its own line. */
function stub(name, stdout = "") {
  const path = join(binDir, name);

  writeFileSync(path, `#!/bin/sh\nprintf '%s\\n' "$@" >> "${argvLog}"\nprintf '%s\\n' "${stdout}"\n`);
  chmodSync(path, 0o755);
}

stub("launchctl");
stub("systemctl");
stub("sc", "SERVICE_NAME: rule-mcp");

process.env.PATH = `${binDir}:${process.env.PATH}`;

// The HOME the adapters resolve at load is the one carrying the metacharacters.
const { installLaunchAgent } = await import("../_launchd.js");
const { installSystemdService } = await import("../_systemd.js");
const { installWindowsService } = await import("../_windows-service.js");

const results = {
  launchd: installLaunchAgent({}),
  systemd: installSystemdService({}),
  windows: installWindowsService({}),
};

process.stdout.write(JSON.stringify({ base, home, meta, argv: readFileSync(argvLog, "utf8").split("\n").filter(Boolean), injected: existsSync(join(home, "INJECTED")), results }));
