/**
 * @module cli/setup/step-extras
 *
 * Step 4: everything beyond the MCP entry itself.
 *
 * All of it is opt-in and each row says exactly which files it touches. The
 * shell installer wrote instruction files and slash commands by default and
 * asked about skills in a single y/N line; users could not see the blast
 * radius before agreeing to it.
 */

import { Box, Text, h } from "./_h.js";
import { COLORS } from "./_theme.js";
import { DetailPanel, SelectList } from "./_widget-list.js";
import { useSelection } from "./_use-selection.js";

/** Every optional step, with the paths it writes. */
export function extraItems({ mode, hasGit }) {
  return [
    {
      id: "rules",
      label: "Instruction rules",
      detail: [
        "Appends the rule workflow block to:",
        "~/.claude/CLAUDE.md, ~/.gemini/GEMINI.md,",
        "~/.codex/AGENTS.md, ~/.cursorrules, ./CLAUDE.md",
        "",
        "Removable: the block is sentinel-delimited.",
      ],
    },
    { id: "commands", label: "Agent slash commands", detail: ["Writes the rule-* command files into every", "detected agent command directory."] },
    {
      id: "skills",
      label: "Bundled rule-* skills",
      detail: ["Copies the skill catalog to ~/.agents/skills.", "", "Not required: the server already serves skills", "from its embedded catalog."],
    },
    {
      id: "gitHook",
      label: "Git post-commit hook",
      detail: hasGit ? ["Adds a background health check to the", "post-commit hook of this repository."] : ["git was not found - this step will be skipped."],
      disabled: !hasGit,
    },
    {
      id: "service",
      label: "Platform daemon service",
      detail: mode === "daemon" ? ["Registers a LaunchAgent, systemd user unit,", "or Windows service that starts at login."] : ["Only applies in daemon mode."],
      disabled: mode !== "daemon",
    },
    { id: "doctor", label: "Health check", detail: ["Runs rule-mcp doctor at the end and", "shows the tail of its report."] },
  ];
}

/**
 * @param {{ items: object[], initial: string[], columns: number, onSubmit: Function, onBack: Function }} props
 */
export function StepExtras({ items, initial, columns, onSubmit, onBack }) {
  const { cursor, selected, current } = useSelection(items, { initial, onSubmit, onBack });

  return h(
    Box,
    { flexDirection: "column" },
    h(Text, { color: COLORS.accentSoft, bold: true }, "Optional steps"),
    h(
      Box,
      { paddingTop: 1 },
      h(Box, { flexDirection: "column", flexGrow: 1 }, h(SelectList, { items, cursor, selected, height: 8 })),
      h(DetailPanel, { title: current?.label ?? "", width: Math.max(34, Math.floor(columns / 2)), lines: current?.detail ?? [] }),
    ),
  );
}
