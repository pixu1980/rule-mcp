/**
 * @module test/install-agent-catalog
 *
 * Agent catalog invariants.
 *
 * 1. The interactive picker offers every supported target, not only the ones
 *    detected on this machine. A user reported the list collapsing to Claude and
 *    Codex because nothing else had a config file yet - which is exactly when
 *    you need the installer to offer the rest. The picker is now Ink-rendered
 *    (ADR 080), so the rows are asserted where they are built.
 * 2. Devin is installable, at the path Devin documents
 *    (`mcp_config.json`, not the `mcp.json` every other agent uses), and is
 *    branded "(formerly Windsurf)" - Cognition acquired Windsurf.
 * 3. Windsurf is removed from the catalog: no picker row, no sweep entry.
 *    Naming it still works as a courtesy redirect to Devin, with a warning.
 * 4. No shell script carries a second copy of the catalog - the drift that
 *    made the bash and PowerShell matrices disagree with this one.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getAllAgents, installAgent, uninstallAgent } from "../index.js";
import { agentRows } from "../../setup/_agent-rows.js";

const root = new URL("../../../..", import.meta.url).pathname;
const installSh = readFileSync(join(root, "scripts", "install.sh"), "utf8");
const entrypoint = join(root, "bin", "rule-mcp.js");

console.log("install agent catalog test");

// ── 1. the picker renders the catalog, not the detection result ───────────

const rows = agentRows();
const rowIds = rows.items.filter((item) => !item.section).map((item) => item.id);

assert.deepEqual(rowIds, getAllAgents(), "the picker must render the whole catalog, in catalog order, not the detection result");
assert.ok(
  rows.items.some((item) => item.section && item.label === "Coding agents") && rows.items.some((item) => item.section && item.label === "IDEs"),
  "the catalog must stay sectioned so the list is readable",
);
assert.ok(
  rows.detected.every((name) => rowIds.includes(name)),
  "every detected agent must have a row to be pre-selected on",
);
assert.ok(
  rows.items.filter((item) => !item.section).every((item) => typeof item.detail === "string" && item.detail.length > 0),
  "every row must explain itself in the detail panel, detected or not",
);
console.log("  ✅ the picker offers every supported target");

// ── 2. Devin ────────────────────────────────────────────────────────────────

assert.ok(getAllAgents().includes("devin"), "devin must be a supported agent");
assert.equal(rows.items.find((item) => item.id === "devin")?.label, "devin (formerly Windsurf)", "the picker must brand Devin with its Windsurf heritage");

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
assert.ok(!rowIds.includes("windsurf"), "the picker must not offer windsurf");

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

// ── 4. one catalog, and only one ───────────────────────────────────────────

for (const script of ["install.sh", "uninstall.sh", "install.ps1", "uninstall.ps1"]) {
  const source = readFileSync(join(root, "scripts", script), "utf8");
  const strays = getAllAgents().filter((agent) => new RegExp(String.raw`\b${agent}\b`).test(source));

  assert.deepEqual(strays, [], `${script} names agents (${strays.join(", ")}) - the catalog lives in src/cli/installers/_catalog.js and nowhere else`);
}
console.log("  ✅ no shell script carries a second agent catalog");

console.log("  ✅ agent catalog invariants hold");
