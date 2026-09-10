

/** @module cli/tui-formats - the install/uninstall/tools/skills result views */

import { banner, color, kv, section, table } from "./index.js";

/** Format install command result for humans. */
export function formatInstallResult(result) {
  const installed = result.installed || {};
  const agents = Object.keys(installed);
  const rows = agents.map((agent) => ["✅", agent, (installed[agent] || []).join(", ")]);
  const lines = [
    banner("rule-mcp install", result.dryRun ? "dry run" : "agent integration"),
    "",
    section("Summary", "📦"),
    kv([
      ["Status", result.ok ? color("ok", "green") : color("failed", "red")],
      ["Mode", result.global ? "global command" : "local node entrypoint"],
      ["Dry run", result.dryRun ? "yes" : "no"],
      ["Agents", `${agents.length}`],
      ["Manifest", result.manifest || "-"],
    ]),
  ];

  if (rows.length > 0) {
    lines.push("", section("Configured agents", "🤖"), table(["", "Agent", "Files"], rows));
  }

  lines.push("", color("Tip: use `rule-mcp doctor --json` for automation output.", "dim"));

  return `${lines.join("\n")}\n`;
}

/** Format uninstall command result for humans. */
export function formatUninstallResult(result) {
  const rows = Object.entries(result.uninstalled || {}).map(([agent, files]) => ["🧹", agent, (files || []).join(", ")]);
  const lines = [
    banner("rule-mcp uninstall", result.dryRun ? "dry run" : "agent cleanup"),
    "",
    section("Summary", "🧽"),
    kv([
      ["Status", result.ok ? color("ok", "green") : color("failed", "red")],
      ["Dry run", result.dryRun ? "yes" : "no"],
      ["Agents", `${result.agents?.length ?? rows.length}`],
      ["Note", result.note || "-"],
    ]),
  ];

  if (rows.length > 0) {
    lines.push("", section("Updated configs", "📁"), table(["", "Agent", "Files"], rows));
  }

  return `${lines.join("\n")}\n`;
}

/** Format registered MCP tools for humans. */
export function formatToolsList(tools) {
  const rows = tools.map((tool) => ["🔧", tool.name, tool.description || ""]);

  return `${[
    banner("rule-mcp tools", `${tools.length} registered tools`),
    "",
    section("Tool registry", "🧰"),
    table(["", "Tool", "Description"], rows, { maxWidth: 72 }),
    "",
    color("Use `rule-mcp tools list --json` to export machine-readable JSON.", "dim"),
  ].join("\n")}\n`;
}

/** Format installed/available skills for humans. */
export function formatSkillsList(skills) {
  const rows = skills.map((skill) => [skill.installed ? "✅" : "○", skill.name, skill.installed ? "installed" : "available", skill.description || ""]);

  return `${[
    banner("rule-mcp skills", `${skills.length} available skills`),
    "",
    section("Skill catalog", "🧠"),
    table(["", "Skill", "Status", "Description"], rows, { maxWidth: 64 }),
    "",
    color("Use `rule-mcp skills list --json` to export machine-readable JSON.", "dim"),
  ].join("\n")}\n`;
}
