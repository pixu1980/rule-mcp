/**
 * @module test/install-force-and-backup
 *
 * Two promises the installer makes and did not keep.
 *
 * `help` documents `--force` as "Override existing config" and threads it into
 * `installAgent`, which never read it: a command file the user had edited was
 * overwritten every time, forced or not. And the writer that takes a backup had
 * no callers while the writer without one had all of them, so an upsert into a
 * config we did not write had no way back if the merge went wrong.
 *
 * Both are asserted here rather than described, because a flag that lies is
 * worse than one that is missing.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("installer force and backup test");

const sandbox = mkdtempSync(join(tmpdir(), "rule-force-"));
const home = join(sandbox, "home");
mkdirSync(join(home, ".claude", "commands"), { recursive: true });

process.env.HOME = home;
process.env.USERPROFILE = home;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { installAgent } = await import("../../src/cli/install/index.js");
const entrypoint = join(sandbox, "rule-mcp.js");
writeFileSync(entrypoint, "// entrypoint\n");

const install = (options = {}) => installAgent({ agent: "claude", entrypoint, ...options });

// ── A command file the user edited ──

install();
const commandsDir = join(home, ".claude", "commands");
const sampleCommand = join(commandsDir, "rule.md");
check("T1 the first install writes the command set", existsSync(sampleCommand));

const MINE = "# my own version\n";
writeFileSync(sampleCommand, MINE);

install();
check("T2 a second install leaves an existing command file alone", readFileSync(sampleCommand, "utf8") === MINE);

install({ force: true });
check("T3 --force overwrites it", readFileSync(sampleCommand, "utf8") !== MINE);

// ── The backup ──

const configFile = join(home, ".claude.json");
check("T4 the install wrote an agent config", existsSync(configFile));

const before = readFileSync(configFile, "utf8");
const EDITED = JSON.stringify({ mcpServers: { mine: { command: "somewhere" } } }, undefined, 2);
writeFileSync(configFile, EDITED);

install({ force: true });
check("T5 writing over an existing config leaves a backup", existsSync(`${configFile}.bak`));
check(
  "T6 the backup holds what was there before the write",
  existsSync(`${configFile}.bak`) && readFileSync(`${configFile}.bak`, "utf8") === EDITED,
);
check("T7 the config itself moved on", readFileSync(configFile, "utf8") !== EDITED && before.length > 0);

// ── The instruction block is refreshed, not left to rot ──
//
// The rules in it change with the server (flex-first is the latest). An install
// that skipped a file already carrying the block meant the text a user
// installed once was the text they kept forever.

const claudeMd = join(home, ".claude", "CLAUDE.md");
const marker = "<!-- rule-mcp -->";
check(
  "T9 the install wrote the instruction block",
  existsSync(claudeMd) && readFileSync(claudeMd, "utf8").includes(marker),
);

const withStale = `# My own notes\n\n${marker}\nSTALE INSTRUCTIONS FROM AN OLDER VERSION\n<!-- /rule-mcp -->\n`;
writeFileSync(claudeMd, withStale);
install({ force: true });
const refreshed = readFileSync(claudeMd, "utf8");
check("T10 a stale instruction block is replaced", !refreshed.includes("STALE INSTRUCTIONS"));
check("T11 the refreshed block carries the current rules", /flex first/i.test(refreshed));
check("T12 the block is not duplicated", refreshed.split(marker).length - 1 === 1);
check("T13 the user's own notes survive", refreshed.includes("# My own notes"));

install({ force: true });
check("T14 refreshing twice is stable", readFileSync(claudeMd, "utf8") === refreshed);

// ── A dry run still writes nothing ──

const dryTarget = join(commandsDir, "rule-backend.md");
const dryBefore = existsSync(dryTarget) ? readFileSync(dryTarget, "utf8") : null;
install({ dryRun: true, force: true });
const dryAfter = existsSync(dryTarget) ? readFileSync(dryTarget, "utf8") : null;
check("T8 a forced dry run changes nothing on disk", dryBefore === dryAfter);

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
