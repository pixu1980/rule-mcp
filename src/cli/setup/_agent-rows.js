/**
 * @module cli/setup/agent-rows
 *
 * The agent catalog as list rows: sectioned, badged, and pre-selected.
 *
 * Detection reads two different facts and the row shows both. "Present"
 * means the agent is on this machine; "configured" means it already points
 * at this server. An agent that is absent stays in the list, unselected, so
 * a user installing ahead of an agent can still tick it.
 */

import { allAgents, detectInstalledAgents } from "../install/index.js";
import { COLORS, GLYPHS } from "./_theme.js";

/** Where the catalog stops listing coding agents and starts listing IDEs. */
const IDE_START = allAgents.indexOf("vscode");

/** Names the catalog spells differently from the label users know. */
const LABELS = { devin: "devin (formerly Windsurf)" };

/**
 * Build the rows and the set that should start ticked.
 *
 * @returns {{ items: object[], detected: string[], configured: string[] }}
 */
export function agentRows() {
  const status = new Map(detectInstalledAgents().map((agent) => [agent.name, agent]));
  const detected = [];
  const configured = [];

  const toRow = (name) => {
    const entry = status.get(name);
    const present = Boolean(entry?.configFile);

    if (present) {
      detected.push(name);
    }

    if (entry?.configured) {
      configured.push(name);
    }

    return {
      id: name,
      label: LABELS[name] ?? name,
      note: entry?.configured ? `${GLYPHS.ok} configured` : present ? `${GLYPHS.radioOn} detected` : "",
      noteColor: entry?.configured ? COLORS.ok : COLORS.info,
      detail: entry?.configFile ?? "no config file on this machine yet",
    };
  };

  const items = [
    { section: true, label: "Coding agents", id: "section:agents" },
    ...allAgents.slice(0, IDE_START).map((name) => toRow(name)),
    { section: true, label: "IDEs", id: "section:ides" },
    ...allAgents.slice(IDE_START).map((name) => toRow(name)),
  ];

  return { items, detected, configured };
}
