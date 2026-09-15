

/**
 * @module cli/setup/step-mode
 *
 * Step 3: how the agents reach the server.
 *
 * The catalog only wires daemon and docker for the agents that document
 * HTTP/SSE support, so the panel says which ones those are instead of
 * letting the user discover it as a per-agent warning three steps later.
 */

import { Box, Text, h } from "./_h.js";
import { remoteModeAgents } from "../installers/index.js";
import { COLORS, GLYPHS } from "./_theme.js";
import { ListDetail } from "./_widget-list.js";
import { useSelection } from "./_use-selection.js";

/** The three transports, with what each one costs the user. */
export const MODE_ITEMS = [
  {
    id: "stdio",
    label: "stdio",
    detail: ["The agent starts a local process per session.", "No background service, no port, works everywhere.", "", "Supported by every agent in the catalog."],
  },
  {
    id: "daemon",
    label: "daemon",
    detail: [
      "One background SSE service on port 37999.",
      "Registered with launchd, systemd, or the Windows",
      "service manager and started at login.",
      "",
      `Only: ${[...remoteModeAgents].join(", ")}`,
    ],
  },
  {
    id: "docker",
    label: "docker",
    detail: ["The SSE service in a container via compose.", "Needs Docker Compose v2 and a daemon token.", "", `Only: ${[...remoteModeAgents].join(", ")}`],
  },
];

/**
 * The mode rows for the agents on the previous screen.
 *
 * Daemon and docker are discouraged, never removed, when someone selected
 * cannot use them: the row names who, so the reason travels with the choice
 * instead of arriving three steps later as a per-agent failure.
 *
 * @param {string[]} [agents]
 */
export function modeItemsFor(agents = []) {
  const unsupported = agents.filter((agent) => !remoteModeAgents.has(agent));

  if (agents.length > 0 && unsupported.length === 0) {
    return MODE_ITEMS;
  }

  const note = `not recommended${unsupported.length > 0 ? ` for ${unsupported.join(", ")}` : ""}`;

  return MODE_ITEMS.map((item) => (item.id === "stdio" ? item : { ...item, label: `${item.label} (${note})` }));
}

/**
 * @param {{ initial: string, columns: number, agents: string[], onSubmit: Function, onBack: Function }} props
 */
export function StepMode({ initial, columns, agents = [], onSubmit, onBack }) {
  const items = modeItemsFor(agents);
  const { cursor, selected, current } = useSelection(items, {
    initial: [initial],
    mode: "radio",
    onSubmit: (id) => onSubmit(id),
    onBack,
  });
  const unsupported = current?.id === "stdio" ? [] : agents.filter((agent) => !remoteModeAgents.has(agent));

  return h(
    Box,
    { flexDirection: "column" },
    h(Text, { color: COLORS.accentSoft, bold: true }, "Install mode"),
    h(ListDetail, { items, cursor, selected, current, mode: "radio", height: 6, columns }),
    unsupported.length > 0
      ? h(Box, { paddingTop: 1 }, h(Text, { color: COLORS.warn }, `${GLYPHS.warn} ${unsupported.join(", ")} will fall back to a warning - they only support stdio.`))
      : null,
  );
}
