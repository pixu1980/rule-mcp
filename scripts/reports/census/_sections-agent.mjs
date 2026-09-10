

/**
 * @module scripts/reports/census/_sections-agent
 *
 * The sections that describe how an agent reaches the server: the slash
 * commands written into each host, and the hooks.
 */

import { table } from "./_format.mjs";
import { AGENTS_WITHOUT_COMMAND_SURFACE, COMMAND_TARGETS, ROUTER_COMMAND, hookEntries } from "./_registries.mjs";

/** The same command set, written in every host's own format. */
export function commandSection(data) {
  return [
    `## Agent slash commands (${data.commands.length})`,
    "",
    `The router \`/${ROUTER_COMMAND}\` is pinned first; the rest follow in`,
    "locale-alphabetical order. The same set is written for every agent and IDE,",
    "in that host's own format (ADR 034).",
    "",
    "Directories are resolved per machine and are not listed here: they depend on",
    "which agents are installed and where their homes are.",
    "",
    ...table(
      ["Target", "Agent", "Format", "Scope", "Prefixes MCP prompts"],
      COMMAND_TARGETS.map((target) => [target.label, `\`${target.agent}\``, `\`${target.format}\``, target.scope, target.namespacedPrompts ? "yes" : "no"]),
    ),
    "",
    `${Object.keys(AGENTS_WITHOUT_COMMAND_SURFACE).length} more agents get the MCP config but no command files, each for a stated reason:`,
    "",
    ...table(
      ["Agent", "Why not"],
      Object.entries(AGENTS_WITHOUT_COMMAND_SURFACE).map(([agent, reason]) => [`\`${agent}\``, reason]),
    ),
    "",
  ];
}

/**
 * What each hook event carries, read from the entries the installer writes
 * rather than described beside them: the matcher, the guard command and the
 * status line are all in the entry, and a table that restated them by hand
 * would be a fourth copy that can disagree with the settings file.
 */
export function hookSection() {
  const entries = hookEntries({ command: "rule-mcp" });
  const rows = Object.entries(entries).flatMap(([event, list]) =>
    list.map((entry) => {
      const [hook] = entry.hooks;

      return [`\`${event}\``, entry.matcher ? `\`${entry.matcher}\`` : "-", `\`${hook.command.split("  #")[0]}\``, hook.statusMessage, `${hook.timeout}s`];
    }),
  );

  return [
    `## Hooks (${rows.length} entries across ${Object.keys(entries).length} events)`,
    "",
    "Written into the host's settings file by `install --agent claude`, and",
    "removed by `uninstall`. Every entry carries a marker comment, which is how",
    "a merge and an uninstall find ours without touching anyone else's. Each one",
    "answers `ask`, never `deny`: these are judgment calls with a human in the",
    "room, and a hard block on a false positive costs more than the prompt it",
    "saves.",
    "",
    ...table(["Event", "Matcher", "Command", "What it says while it runs", "Timeout"], rows),
    "",
  ];
}
