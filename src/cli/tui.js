/**
 * @module cli/tui
 *
 * Small, dependency-free Terminal UI primitives for rule-mcp commands.
 * Keeps command handlers focused on behavior while this module owns human
 * presentation: color, emojis, sections, compact tables, and JSON escape hatches.
 */

const ANSI = {
  reset: "\u{1B}[0m",
  bold: "\u{1B}[1m",
  dim: "\u{1B}[2m",
  cyan: "\u{1B}[36m",
  green: "\u{1B}[32m",
  yellow: "\u{1B}[33m",
  red: "\u{1B}[31m",
  magenta: "\u{1B}[35m",
  blue: "\u{1B}[34m",
};

/** Whether ANSI color should be emitted for interactive terminals. */
export function shouldUseColor() {
  if (process.env.NO_COLOR) {return false;}
  if (process.env.FORCE_COLOR) {return true;}
  return Boolean(process.stdout.isTTY);
}

/** Colorize text only when the output stream supports it. */
export function color(text, tone = "reset") {
  if (!shouldUseColor()) {return String(text);}
  return `${ANSI[tone] || ""}${text}${ANSI.reset}`;
}

/** Strip ANSI escapes before calculating terminal column widths. */
function visibleLength(value) {
  return String(value).replaceAll(/\x1B\[[0-9;]*m/g, "").length;
}

/** Truncate text to a terminal-friendly width. */
export function truncate(value, max = 80) {
  const text = String(value ?? "").replaceAll(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

/** Render a command title banner. */
export function banner(title, subtitle = "") {
  const width = Math.max(48, visibleLength(title) + 8, visibleLength(subtitle) + 8);
  const top = `╔${"═".repeat(width - 2)}╗`;
  const bottom = `╚${"═".repeat(width - 2)}╝`;
  const line = (text) => {
    const raw = String(text);
    const pad = Math.max(0, width - 6 - visibleLength(raw));
    return `║  ${raw}${" ".repeat(pad)}  ║`;
  };
  const lines = [top, line(title)];
  if (subtitle) {lines.push(line(color(subtitle, "dim")));}
  lines.push(bottom);
  return color(lines.join("\n"), "cyan");
}

/** Render a section heading. */
export function section(title, icon = "✨") {
  return `${icon} ${color(title, "bold")}\n${color("─".repeat(Math.max(8, visibleLength(title) + 3)), "dim")}`;
}

/** Render a key-value list. */
export function kv(rows) {
  let maxKey = 0;
  for (const [key] of rows) {
    maxKey = Math.max(maxKey, visibleLength(key));
  }
  return rows.map(([key, value]) => `${color(String(key).padEnd(maxKey), "dim")}  ${value}`).join("\n");
}

/** Render a compact table. */
export function table(headers, rows, { maxWidth = 54 } = {}) {
  const normalized = rows.map(row => row.map((cell, index) => index === row.length - 1 ? truncate(cell, maxWidth) : String(cell ?? "")));
  const widths = headers.map((header, index) => Math.min(maxWidth, Math.max(
    visibleLength(header),
    ...normalized.map(row => visibleLength(row[index] ?? "")),
  )));
  const renderRow = (row) => row.map((cell, index) => String(cell ?? "").padEnd(widths[index])).join("  ");
  return [
    color(renderRow(headers), "bold"),
    color(widths.map(w => "─".repeat(w)).join("  "), "dim"),
    ...normalized.map(renderRow),
  ].join("\n");
}

/** Format install command result for humans. */
export function formatInstallResult(result) {
  const installed = result.installed || {};
  const agents = Object.keys(installed);
  const rows = agents.map(agent => [
    "✅",
    agent,
    (installed[agent] || []).join(", "),
  ]);
  const lines = [
    banner("rule-mcp install", result.dryRun ? "dry run" : "agent integration"),
    "",
    section("Summary", "📦"),
    kv([
      ["Status", result.ok ? color("ok", "green") : color("failed", "red")],
      ["Mode", result.global ? "global command" : "local node entrypoint"],
      ["Dry run", result.dryRun ? "yes" : "no"],
      ["Agents", `${agents.length}`],
      ["Manifest", result.manifest || "—"],
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
      ["Note", result.note || "—"],
    ]),
  ];
  if (rows.length > 0) {lines.push("", section("Updated configs", "📁"), table(["", "Agent", "Files"], rows));}
  return `${lines.join("\n")}\n`;
}

/** Format registered MCP tools for humans. */
export function formatToolsList(tools) {
  const rows = tools.map(tool => ["🔧", tool.name, tool.description || ""]);
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
  const rows = skills.map(skill => [
    skill.installed ? "✅" : "○",
    skill.name,
    skill.installed ? "installed" : "available",
    skill.description || "",
  ]);
  return `${[
    banner("rule-mcp skills", `${skills.length} available skills`),
    "",
    section("Skill catalog", "🧠"),
    table(["", "Skill", "Status", "Description"], rows, { maxWidth: 64 }),
    "",
    color("Use `rule-mcp skills list --json` to export machine-readable JSON.", "dim"),
  ].join("\n")}\n`;
}
