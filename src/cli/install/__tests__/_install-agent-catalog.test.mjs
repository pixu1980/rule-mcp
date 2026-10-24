/**
 * @module test/install-agent-catalog
 *
 * Agent catalog invariants.
 *
 * 1. The wizard's agent screen offers every supported target, not only the ones
 *    detected on this machine. A user reported the list collapsing to Claude and
 *    Codex because nothing else had a config file yet - which is exactly when
 *    you need the installer to offer the rest.
 * 2. Devin is installable, at the path Devin documents
 *    (`mcp_config.json`, not the `mcp.json` every other agent uses), and is
 *    branded "(formerly Windsurf)" - Cognition acquired Windsurf.
 * 3. Windsurf is removed from the catalog: no picker row, no sweep entry.
 *    Naming it still works as a courtesy redirect to Devin, with a warning.
 * The screen itself is Ink now (ADR 090), so what used to be asserted against
 * the bash picker is asserted against the rows it renders.
 */

import { strict as assert } from "node:assert";
import { homedir } from "node:os";
import { join } from "node:path";
import { getAllAgents, installAgent, uninstallAgent } from "../index.js";
import { agentCatalog, agentRows } from "../../setup/_agent-rows.js";

const root = new URL("../../../..", import.meta.url).pathname;
const entrypoint = join(root, "bin", "rule-mcp.js");

console.log("install agent catalog test");

// ── 1. the screen renders the catalog, not the detection result ───────────

const { items, detected } = agentRows();
const offered = new Set(items.filter((item) => !item.section).map((item) => item.id));

for (const agent of getAllAgents()) {
  assert.ok(offered.has(agent), `${agent} must be offered by the agent screen`);
}

assert.ok(offered.size >= getAllAgents().length, "the rows are the catalog, not the detection result");
assert.ok(
  detected.every((name) => offered.has(name)),
  "a detected agent must be a row that can be ticked",
);
assert.deepEqual(
  detected,
  agentCatalog()
    .filter((entry) => entry.present && !entry.deprecated)
    .map((entry) => entry.name),
  "detected agents start pre-selected, and a superseded name never does",
);
assert.ok(
  items.some((item) => item.section),
  "the list is sectioned, so a 23-row catalog can be read",
);
console.log("  ✅ the agent screen offers every supported target");

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

assert.ok(skillFiles.length > 1, "devin must receive the clean /rule-mcp-* command set as skills");
assert.ok(
  skillFiles.every((path) => path.includes(join("devin", "skills"))),
  `devin skills must land under the documented skills dir: ${skillFiles[0]}`,
);
// The router is `rule_tool` with no suffix; every other command is rule-mcp-<area>.
assert.match(skillFiles[0], /rule(?:-[\w-]+)?\/SKILL\.md$/, "each command is its own directory containing SKILL.md");
console.log("  ✅ devin installs to its documented config path, branded (formerly Windsurf)");

// ── 3. Windsurf is gone from the catalog; naming it redirects to Devin ─────

assert.ok(!getAllAgents().includes("windsurf"), "windsurf must not be offered by the catalog - Cognition renamed it Devin");
assert.ok(
  agentRows().items.every((item) => item.id !== "windsurf"),
  "the agent screen must not offer windsurf",
);

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

console.log("  ✅ agent catalog invariants hold");
