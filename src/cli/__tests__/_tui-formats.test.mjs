/** The install/uninstall/tools/skills terminal views: every result shape renders, no branch left dark. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { formatInstallResult, formatSkillsList, formatToolsList, formatUninstallResult } from "../_tui-formats.js";

// Hermetic: color is decided by NO_COLOR / FORCE_COLOR / TTY, and a runner that
// exports FORCE_COLOR would turn plain-substring assertions into escape soup.
delete process.env.FORCE_COLOR;
delete process.env.NO_COLOR;

test("formatInstallResult renders a populated result with the agents table", () => {
  const ui = formatInstallResult({
    ok: true,
    global: true,
    dryRun: false,
    manifest: "/tmp/manifest.json",
    installed: { claude: ["~/.claude.json"], pi: ["~/.pi/agent/mcp.json"] },
  });

  assert.match(ui, /rule-mcp install/);
  assert.match(ui, /Status.*ok/);
  assert.match(ui, /global command/);
  assert.match(ui, /Configured agents/);
  assert.match(ui, /claude/);
  assert.match(ui, /doctor --json/);
});

test("formatInstallResult renders a failed dry run with no agents", () => {
  const ui = formatInstallResult({ ok: false, dryRun: true });

  assert.match(ui, /dry run/);
  assert.match(ui, /failed/);
  assert.match(ui, /Manifest\s+-/, "a missing manifest renders as a dash");
  assert.doesNotMatch(ui, /Configured agents/, "no table without agents");
});

test("formatUninstallResult renders cleanup rows and the agent count fallback", () => {
  const ui = formatUninstallResult({
    ok: true,
    dryRun: false,
    uninstalled: { claude: ["~/.claude.json"], cursor: [] },
  });

  assert.match(ui, /rule-mcp uninstall/);
  assert.match(ui, /Updated configs/);
  assert.match(ui, /Agents\s+2/, "falls back to the row count when agents is absent");
});

test("formatUninstallResult renders an empty failed run without a table", () => {
  const ui = formatUninstallResult({ ok: false, dryRun: true, agents: [], note: "nothing installed" });

  assert.match(ui, /failed/);
  assert.match(ui, /nothing installed/);
  assert.doesNotMatch(ui, /Updated configs/);
});

test("formatToolsList renders the registry with blank descriptions tolerated", () => {
  const ui = formatToolsList([{ name: "pix_tool", description: "route" }, { name: "rule_tool_check" }]);

  assert.match(ui, /2 registered tools/);
  assert.match(ui, /rule_tool_check/);
  assert.match(ui, /tools list --json/);
});

test("formatSkillsList marks installed and available skills apart", () => {
  const ui = formatSkillsList([
    { name: "rule-frontend-react", installed: true, description: "react" },
    { name: "rule-backend-node", installed: false },
  ]);

  assert.match(ui, /2 available skills/);
  assert.match(ui, /installed/);
  assert.match(ui, /available/);
  assert.match(ui, /skills list --json/);
});
