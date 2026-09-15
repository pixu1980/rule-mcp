

/**
 * @module cli/setup/agent-rows
 *
 * The agent catalog as list rows: sectioned, badged, and pre-selected.
 *
 * Detection reads two different facts and the row shows both. "Present"
 * means the agent is on this machine; "configured" means it already points
 * at this server. An agent that is absent stays in the list, unselected, so
 * a user installing ahead of an agent can still tick it - a picker that
 * offered only what it detected collapsed to two rows on a fresh machine,
 * which is exactly when the rest is wanted.
 *
 * A deprecated name stays in the list too, labeled with what replaced it: it
 * is still installable and still removable, it is just never swept by
 * `--agent all`.
 */

import { allAgents, deprecatedAgents } from "../installers/index.js";
import { detectInstalledAgents } from "../install/index.js";
import { COLORS, GLYPHS } from "./_theme.js";

/** Where the catalog stops listing coding agents and starts listing IDEs. */
const IDE_START = allAgents.indexOf("vscode");

/**
 * Every agent, with what detection knows about it.
 *
 * The flat form the rows are built from, and the one a caller wants when it
 * needs the catalog rather than a rendered list.
 *
 * @returns {Array<{ name: string, present: boolean, configured: boolean, configFile: string|null, deprecated: string|undefined }>}
 */
export function agentCatalog() {
  const status = new Map(detectInstalledAgents().map((agent) => [agent.name, agent]));

  return allAgents.map((name) => {
    const entry = status.get(name);

    return {
      name,
      present: Boolean(entry?.configFile),
      configured: Boolean(entry?.configured),
      configFile: entry?.configFile ?? null,
      deprecated: deprecatedAgents.get(name),
    };
  });
}

/**
 * Build the rows and the sets that should start ticked.
 *
 * @returns {{ items: object[], detected: string[], configured: string[] }}
 */
export function agentRows() {
  const catalog = agentCatalog();
  const detected = catalog.filter((entry) => entry.present && !entry.deprecated).map((entry) => entry.name);
  const configured = catalog.filter((entry) => entry.configured).map((entry) => entry.name);

  const toRow = (entry) => ({
    id: entry.name,
    label: entry.deprecated ? `${entry.name} (superseded by ${entry.deprecated})` : entry.name,
    note: entry.configured ? `${GLYPHS.ok} configured` : entry.present ? `${GLYPHS.radioOn} detected` : "",
    noteColor: entry.configured ? COLORS.ok : COLORS.info,
    detail: entry.configFile ?? "no config file on this machine yet",
  });

  const items = [
    { section: true, label: "Coding agents", id: "section:agents" },
    ...catalog.slice(0, IDE_START).map((entry) => toRow(entry)),
    { section: true, label: "IDEs", id: "section:ides" },
    ...catalog.slice(IDE_START).map((entry) => toRow(entry)),
  ];

  return { items, detected, configured };
}
