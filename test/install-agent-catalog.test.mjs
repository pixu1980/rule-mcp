/**
 * @module test/install-agent-catalog
 *
 * Three invariants of the agent catalog.
 *
 * 1. The interactive picker offers every supported target, not only the ones
 *    detected on this machine. A user reported the list collapsing to Claude and
 *    Codex because nothing else had a config file yet - which is exactly when
 *    you need the installer to offer the rest.
 * 2. Devin is installable, and at the path Devin documents
 *    (`mcp_config.json`, not the `mcp.json` every other agent uses).
 * 3. Windsurf is deprecated: never swept by `--agent all`, still installable and
 *    still uninstallable when named.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getAllAgents, installAgent, uninstallAgent } from "../src/cli/install.js";

const root = new URL("..", import.meta.url).pathname;
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

assertInstallSh(
  'for i in "${!AGENT_NAMES[@]}"; do\n          mark=" "',
  "the agent checkbox list must iterate AGENT_NAMES (the catalog), not DETECTED_AGENTS",
);
assertInstallSh("${selected_count}/${#AGENT_NAMES[@]}", "the selected counter must be out of the full catalog");
assert.ok(
  !installSh.includes("AGENT_CURSOR -ge ${#DETECTED_AGENTS[@]}"),
  "cursor wrapping must follow the catalog, or the lower entries are unreachable",
);
assertInstallSh(
  "${AGENT_DETECTED[$ai]} -eq 1 ]] && ! is_deprecated_agent",
  "detected non-deprecated agents must start pre-selected",
);
assertInstallSh("No supported coding agents detected on this machine.", "an empty detection must not abort the picker");
console.log("  ✅ the picker offers every supported target");

// ── 2. Devin ────────────────────────────────────────────────────────────────

assert.ok(getAllAgents().includes("devin"), "devin must be a supported agent");

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
assertInstallSh("$HOME_DIR/.config/devin/mcp_config.json", "install.sh must probe the devin config");
console.log("  ✅ devin installs to its documented config path");

// ── 3. Windsurf is deprecated, not removed ──────────────────────────────────

const sweep = installAgent({ agent: "all", entrypoint, dryRun: true });

assert.ok(!Object.keys(sweep.installed).includes("windsurf"), "--agent all must skip a deprecated agent");
assert.ok(Object.keys(sweep.installed).includes("devin"), "--agent all must include devin");

const explicit = installAgent({ agent: "windsurf", entrypoint, dryRun: true });

assert.ok(Array.isArray(explicit.installed.windsurf), "an explicitly requested windsurf must still install");
assert.deepEqual(
  explicit.warnings,
  ['"windsurf" is deprecated - use "devin" instead.'],
  "naming a deprecated agent must warn, and must point at Devin - Cognition acquired Windsurf",
);
assert.ok(!sweep.warnings, "a sweep that skipped the deprecated agent has nothing to warn about");

const removed = uninstallAgent({ agent: "windsurf", dryRun: true });

assert.ok(removed.uninstalled?.windsurf ?? removed.windsurf, "windsurf must stay uninstallable for existing installs");
assertInstallSh("deprecated - use devin", "the picker must label windsurf as deprecated");
console.log("  ✅ windsurf is deprecated in favor of devin, and still removable");

console.log("  ✅ agent catalog invariants hold");
