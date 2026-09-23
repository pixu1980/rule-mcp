

/**
 * @module scripts/reports/census/_sections-install
 *
 * The install targets, and which of them also get slash-command files.
 *
 * `allAgents` is the list `install --agent <name>` and the setup wizard accept;
 * `COMMAND_TARGETS` and `AGENTS_WITHOUT_COMMAND_SURFACE` decide whether a host
 * also receives per-command files. Reading all three means the chapter cannot
 * promise a host the installer does not have, or miss one it gained.
 */

import { table } from "./_format.mjs";
import { AGENTS_WITHOUT_COMMAND_SURFACE, COMMAND_TARGETS, allAgents, remoteModeAgents } from "./_registries.mjs";

/**
 * @param {object} _data - the gathered surface (this section reads the registries directly)
 * @returns {string[]}
 */
export function agentTargetSection(_data) {
  const commands = new Map();

  for (const target of COMMAND_TARGETS) {
    const entry = commands.get(target.agent) ?? { formats: new Set(), scopes: new Set() };

    entry.formats.add(target.format);
    entry.scopes.add(target.scope);
    commands.set(target.agent, entry);
  }

  const rows = allAgents.map((agent) => {
    const entry = commands.get(agent);
    const commandFiles = entry ? `yes: ${[...entry.formats].join(", ")} (${[...entry.scopes].join(", ")})` : "no";
    const transport = remoteModeAgents.has(agent) ? "stdio, daemon, docker" : "stdio";
    const note = AGENTS_WITHOUT_COMMAND_SURFACE[agent] ?? "";

    return [`\`${agent}\``, commandFiles, transport, note];
  });

  const legacy = [...commands.keys()].filter((agent) => !allAgents.includes(agent));

  return [
    `## Install targets (${allAgents.length})`,
    "",
    "`rule-mcp install --agent <name>` and the setup wizard accept exactly",
    "these names. A host listed with command files also gets the slash commands in",
    "its own format; the others receive the MCP configuration and reach the same",
    "prompts through the server.",
    "",
    ...table(["`--agent`", "Command files", "Transport", "Notes"], rows),
    "",
    // A command target keyed under a name the installer no longer accepts is a
    // real gap: the files exist for a host that cannot be asked for by that
    // name. Naming it here beats leaving the reader to infer it from a "no".
    ...(legacy.length > 0
      ? [
          `Command files are also registered under ${legacy.map((name) => `\`${name}\``).join(", ")}, which the installer no longer accepts as an agent name (a deprecated alias): installing the host under its current name writes no command files.`,
          "",
        ]
      : []),
    "Regenerate with `pnpm census`.",
    "",
    `Per-host formats and the command surface itself: [\`11-instructions.md\`](11-instructions.md). Slash-command targets: ${COMMAND_TARGETS.length} across ${commands.size} hosts.`,
    "",
  ];
}
