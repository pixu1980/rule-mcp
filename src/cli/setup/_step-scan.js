/**
 * @module cli/setup/step-scan
 *
 * Uninstall step 1: what was found, and what of it to remove.
 *
 * Every group carries its own count and the paths behind it. A user removing
 * five agent entries should be able to read the five files before agreeing,
 * not after.
 */

import { Box, Text, h } from "./_h.js";
import { COLORS, GLYPHS } from "./_theme.js";
import { DetailPanel, SelectList } from "./_widget-list.js";
import { useSelection } from "./_use-selection.js";

/** Turn scan groups into list rows, empty groups included but unticked. */
export function groupItems(groups) {
  return groups.map((group) => ({
    id: group.id,
    label: group.label,
    note: group.count > 0 ? `${group.count}` : "nothing found",
    noteColor: group.count > 0 ? COLORS.info : COLORS.muted,
    detail: group.count > 0 ? [group.detail, "", ...group.items] : [group.detail, "", "Nothing to remove."],
    count: group.count,
  }));
}

/**
 * @param {{ items: object[], initial: string[], columns: number, height: number, onSubmit: Function, onBack: Function }} props
 */
export function StepScan({ items, initial, columns, height, onSubmit, onBack }) {
  const { cursor, selected, current } = useSelection(items, { initial, onSubmit, onBack });
  const total = items.reduce((sum, item) => sum + (selected.has(item.id) ? item.count : 0), 0);

  return h(
    Box,
    { flexDirection: "column" },
    h(Text, { color: COLORS.accentSoft, bold: true }, "What to remove"),
    h(
      Box,
      { paddingTop: 1 },
      h(Box, { flexDirection: "column", flexGrow: 1 }, h(SelectList, { items, cursor, selected, height })),
      h(DetailPanel, { title: current?.label ?? "", width: Math.max(34, Math.floor(columns / 2)), lines: current?.detail ?? [] }),
    ),
    h(Box, { paddingTop: 1 }, h(Text, { color: COLORS.muted }, `${GLYPHS.arrow} ${total} item(s) across ${selected.size} group(s)`)),
  );
}
