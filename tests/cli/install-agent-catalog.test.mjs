/**
 * @module test/install-agent-catalog
 *
 * Agent catalog invariants.
 *
 * 1. The interactive picker offers every supported target, not only the ones
 *    detected on this machine. A user reported the list collapsing to Claude and
 *    Codex because nothing else had a config file yet - which is exactly when
 *    you need the installer to offer the rest.
 * 2. Devin is installable, at the path Devin documents
 *    (`mcp_config.json`, not the `mcp.json` every other agent uses), and is
 *    branded "(formerly Windsurf)" - Cognition acquired Windsurf.
 * 3. Windsurf is removed from the catalog: no picker row, no sweep entry.
 *    Naming it still works as a courtesy redirect to Devin, with a warning.
 * 4. The picker redraws rows incrementally (ANSI cursor addressing) instead of
 *    full-screen clearing on every keypress - the flicker regression guard.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getAllAgents, installAgent, uninstallAgent } from "../../src/cli/install/index.js";

const root = new URL("../..", import.meta.url).pathname;
const installSh = readFileSync(join(root, "scripts", "install.sh"), "utf8");
const entrypoint = join(root, "bin", "rule-mcp.js");

console.log("install agent catalog test");

// ── 1. the picker renders the catalog, not the detection result ───────────

/**
 * assert.match dumps the whole 800-line script on failure, which buries the
 * message. Substring checks keep the output readable.
 *
 * @param {string} needle
 * @param {string} message
 */
function assertInstallSh(needle, message) {
  assert.ok(installSh.includes(needle), `${message}\n  missing from scripts/install.sh: ${needle}`);
}

assertInstallSh('for i in "${!AGENT_NAMES[@]}"', "the agent checkbox list must iterate AGENT_NAMES (the catalog), not DETECTED_AGENTS");
assertInstallSh("AGENT_CURSOR -ge ${#AGENT_NAMES[@]}", "cursor wrapping must follow the catalog, or the lower entries are unreachable");
assert.ok(!installSh.includes("AGENT_CURSOR -ge ${#DETECTED_AGENTS[@]}"), "cursor wrapping must follow the catalog, or the lower entries are unreachable");
assertInstallSh(
  "${AGENT_DETECTED[$ai]} -eq 1 ]] && AGENT_FLAGS[$ai]=1",
  "detected agents must start pre-selected (AGENT_DETECTED is a per-row flag, populated from the detection result)",
);
assertInstallSh("No supported coding agents detected on this machine.", "an empty detection must not abort the picker");
console.log("  ✅ the picker offers every supported target");

// ── 2. Devin ────────────────────────────────────────────────────────────────

assert.ok(getAllAgents().includes("devin"), "devin must be a supported agent");
assertInstallSh("(formerly Windsurf)", "install.sh must brand Devin with its Windsurf heritage");
assertInstallSh("$HOME_DIR/.config/devin/mcp_config.json", "install.sh must probe the devin config");

const devin = installAgent({ agent: "devin", entrypoint, dryRun: true });
const devinPath = devin.installed.devin;

assert.ok(Array.isArray(devinPath), `devin install failed: ${JSON.stringify(devin.installed.devin)}`);
assert.equal(
  devinPath[0],
  process.platform === "win32"
    ? join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "devin", "mcp_config.json")
    : join(homedir(), ".config", "devin", "mcp_config.json"),
  "devin config must be mcp_config.json in the documented location",
);
assert.ok(
  devinPath.every((path) => !path.endsWith("instructions.md")),
  "Devin documents no global instructions file - writing one would leave a file nothing reads",
);

// Devin custom skills: one directory per command holding SKILL.md, invoked as /<name>.
const skillFiles = devinPath.filter((path) => path.endsWith("SKILL.md"));

assert.ok(skillFiles.length > 1, "devin must receive the clean /rule-* command set as skills");
assert.ok(
  skillFiles.every((path) => path.includes(join("devin", "skills"))),
  `devin skills must land under the documented skills dir: ${skillFiles[0]}`,
);
// The router is `pix_tool` with no suffix; every other command is rule-<area>.
assert.match(skillFiles[0], /rule(?:-[\w-]+)?\/SKILL\.md$/, "each command is its own directory containing SKILL.md");
console.log("  ✅ devin installs to its documented config path, branded (formerly Windsurf)");

// ── 3. Windsurf is gone from the catalog; naming it redirects to Devin ─────

assert.ok(!getAllAgents().includes("windsurf"), "windsurf must not be offered by the catalog - Cognition renamed it Devin");
assert.ok(!installSh.includes("windsurf"), "install.sh must not contain a windsurf entry anywhere");
assert.ok(!/\bwindsurf\b/.test(readFileSync(join(root, "scripts", "install.ps1"), "utf8")), "install.ps1 must not list windsurf");

const sweep = installAgent({ agent: "all", entrypoint, dryRun: true });

assert.ok(!Object.keys(sweep.installed).includes("windsurf"), "--agent all must not include windsurf");
assert.ok(Object.keys(sweep.installed).includes("devin"), "--agent all must include devin");

const redirect = installAgent({ agent: "windsurf", entrypoint, dryRun: true });

assert.ok(!Object.prototype.hasOwnProperty.call(redirect.installed, "windsurf"), "a windsurf request must be redirected, not installed under the legacy name");
assert.ok(Array.isArray(redirect.installed.devin), "a windsurf request must install Devin instead");
assert.deepEqual(redirect.warnings, ['"windsurf" is deprecated - use "devin" instead.'], "naming windsurf must warn and point at Devin - Cognition acquired Windsurf");
assert.ok(!sweep.warnings, "a sweep that skipped the deprecated agent has nothing to warn about");

const removed = uninstallAgent({ agent: "windsurf", dryRun: true });

assert.ok(Array.isArray(removed.uninstalled?.devin), "uninstalling windsurf must redirect to the devin cleanup");
console.log("  ✅ windsurf removed from the catalog; --agent windsurf redirects to devin");

// ── 4. no full re-render on every keypress (flicker guard) ─────────────────

assertInstallSh("print_at", "the picker must redraw rows with ANSI cursor addressing (differential renderer)");
assertInstallSh("draw_row", "the picker must own per-row drawing");
assert.ok(!installSh.includes("tui_clear"), "the picker must never full-screen clear during interaction - that is the flicker source");
console.log("  ✅ picker redraws rows incrementally, no full-screen clear per key");

console.log("  ✅ agent catalog invariants hold");
