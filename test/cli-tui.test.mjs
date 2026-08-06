/**
 * @module test/cli-tui
 *
 * Verifies the shared Terminal UI formatters used by CLI commands.
 */

import { strict as assert } from "node:assert";
import {
  banner,
  formatInstallResult,
  formatSkillsList,
  formatToolsList,
  formatUninstallResult,
} from "../src/cli/tui.js";

console.log("rule CLI TUI test");

// ── Banner alignment: every line must render the same terminal width ──
// Wide emoji (astral code points, e.g. 🩺) occupy two columns; count them.
const displayWidth = (line) => {
  const bare = line.replaceAll(/\x1B\[[0-9;]*m/g, "");
  let width = 0;
  for (const ch of bare) {
    width += ch.codePointAt(0) > 0xff_ff ? 2 : 1;
  }
  return width;
};
for (const [title, subtitle] of [
  ["🩺 rule-mcp doctor", "healthy"],
  ["rule-mcp install", "dry run"],
  ["a much longer banner title that forces the width to auto-grow", "subtitle"],
]) {
  const widths = banner(title, subtitle).split("\n").map(displayWidth);
  assert.equal(new Set(widths).size, 1, `banner borders must align for "${title}" (got ${widths.join(",")})`);
}

const toolsUi = formatToolsList([
  { name: "rule", description: "Route prompts" },
  { name: "rule_tool_check", description: "Validate code" },
]);
assert.ok(!toolsUi.trimStart().startsWith("["), "tools list default must not be raw JSON");
assert.ok(toolsUi.includes("🧰"), "tools UI should include emoji section marker");
assert.ok(toolsUi.includes("rule_tool_check"), "tools UI should show tool names");
assert.ok(toolsUi.includes("--json"), "tools UI should advertise JSON export");

const installUi = formatInstallResult({
  ok: true,
  dryRun: false,
  global: false,
  installed: { claude: ["/tmp/.claude.json"], pi: ["/tmp/mcp.json"] },
  manifest: "/tmp/installed.md",
});
assert.ok(installUi.includes("📦"), "install UI should include summary emoji");
assert.ok(installUi.includes("claude"), "install UI should list configured agents");

const uninstallUi = formatUninstallResult({
  ok: true,
  dryRun: true,
  agents: ["claude"],
  note: "Removed rule-mcp from claude.",
  uninstalled: { claude: ["/tmp/.claude.json"] },
});
assert.ok(uninstallUi.includes("🧽"), "uninstall UI should include cleanup emoji");
assert.ok(uninstallUi.includes("dry run"), "uninstall UI should show dry-run context");

const skillsUi = formatSkillsList([
  { name: "rule", description: "Router", installed: true },
  { name: "rule-styleguide", description: "Standards", installed: false },
]);
assert.ok(skillsUi.includes("🧠"), "skills UI should include skill emoji");
assert.ok(skillsUi.includes("rule-styleguide"), "skills UI should show skill names");
assert.ok(skillsUi.includes("--json"), "skills UI should advertise JSON export");

console.log("  ✅ shared CLI formatters render friendly TUI output");
