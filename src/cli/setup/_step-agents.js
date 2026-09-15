

/**
 * @module cli/setup/step-agents
 *
 * Step 2: which agents get an MCP entry.
 *
 * Detected agents start ticked, because that is what the user almost always
 * wants, and everything else stays reachable so the choice is theirs.
 */

import { Box, Text, h } from "./_h.js";
import { COLORS, GLYPHS } from "./_theme.js";
import { ListDetail } from "./_widget-list.js";
import { ProgressBar } from "./_widget-progress.js";
import { useSelection } from "./_use-selection.js";

/**
 * @param {{ items: object[], initial: string[], height: number, columns: number, onSubmit: Function, onBack: Function }} props
 */
export function StepAgents({ items, initial, height, columns, onSubmit, onBack }) {
  const { cursor, selected, current } = useSelection(items, { initial, onSubmit, onBack });
  const total = items.filter((item) => !item.section).length;
  const detailWidth = Math.max(24, Math.floor(columns / 3));

  return h(
    Box,
    { flexDirection: "column" },
    h(Text, { color: COLORS.accentSoft, bold: true }, "Select agents"),
    h(ListDetail, {
      items,
      cursor,
      selected,
      current,
      height,
      width: detailWidth,
      lines: [current?.detail ?? "", "", selected.has(current?.id) ? `${GLYPHS.ok} will be configured` : `${GLYPHS.skip} will be left alone`],
    }),
    h(Box, { paddingTop: 1 }, h(ProgressBar, { value: selected.size, total, color: COLORS.accent }), h(Text, { color: COLORS.muted }, "  agents selected")),
  );
}
