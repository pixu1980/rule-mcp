/**
 * @module test/cli-tui
 *
 * Verifies the shared Terminal UI formatters used by CLI commands.
 */

import { strict as assert } from "node:assert";
import {
  formatInstallResult,
  formatSkillsList,
  formatToolsList,
  formatUninstallResult,
} from "../src/cli/tui.js";

console.log("pix CLI TUI test");

const toolsUi = formatToolsList([
  { name: "pix", description: "Route prompts" },
  { name: "pix_check", description: "Validate code" },
]);
assert(!toolsUi.trimStart().startsWith("["), "tools list default must not be raw JSON");
assert(toolsUi.includes("🧰"), "tools UI should include emoji section marker");
assert(toolsUi.includes("pix_check"), "tools UI should show tool names");
assert(toolsUi.includes("--json"), "tools UI should advertise JSON export");

const installUi = formatInstallResult({
  ok: true,
  dryRun: false,
  global: false,
  installed: { claude: ["/tmp/.claude.json"], pi: ["/tmp/mcp.json"] },
  manifest: "/tmp/installed.md",
});
assert(installUi.includes("📦"), "install UI should include summary emoji");
assert(installUi.includes("claude"), "install UI should list configured agents");

const uninstallUi = formatUninstallResult({
  ok: true,
  dryRun: true,
  agents: ["claude"],
  note: "Removed pix-galaxy-mcp from claude.",
  uninstalled: { claude: ["/tmp/.claude.json"] },
});
assert(uninstallUi.includes("🧽"), "uninstall UI should include cleanup emoji");
assert(uninstallUi.includes("dry run"), "uninstall UI should show dry-run context");

const skillsUi = formatSkillsList([
  { name: "pix", description: "Router", installed: true },
  { name: "pix-styleguide", description: "Standards", installed: false },
]);
assert(skillsUi.includes("🧠"), "skills UI should include skill emoji");
assert(skillsUi.includes("pix-styleguide"), "skills UI should show skill names");
assert(skillsUi.includes("--json"), "skills UI should advertise JSON export");

console.log("  ✅ shared CLI formatters render friendly TUI output");
