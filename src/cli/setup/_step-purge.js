

/**
 * @module cli/setup/step-purge
 *
 * Uninstall step 2: the destructive one, kept separate and off by default.
 *
 * Purging takes the SSE token, the caches, the telemetry and any saved API
 * keys with it. That belongs on its own screen with its own count, not
 * folded into a list of config edits.
 */

import { Box, Text, h } from "./_h.js";
import { COLORS, GLYPHS } from "./_theme.js";
import { ListDetail } from "./_widget-list.js";
import { useSelection } from "./_use-selection.js";

/** Purge targets as rows, with their file counts. */
export function purgeItems(targets) {
  return targets.map((target) => ({
    id: target.id,
    label: target.label,
    note: target.exists ? `${target.files} file(s)` : "absent",
    noteColor: target.exists ? COLORS.warn : COLORS.muted,
    detail: [target.dir, "", target.exists ? "Deleted permanently. There is no backup." : "Nothing here to delete."],
    files: target.files,
  }));
}

/**
 * @param {{ items: object[], columns: number, onSubmit: Function, onBack: Function }} props
 */
export function StepPurge({ items, columns, onSubmit, onBack }) {
  const { cursor, selected, current } = useSelection(items, { initial: [], onSubmit, onBack });
  const files = items.reduce((sum, item) => sum + (selected.has(item.id) ? item.files : 0), 0);

  return h(
    Box,
    { flexDirection: "column" },
    h(Text, { color: COLORS.warn, bold: true }, "Purge state and config"),
    h(Box, { paddingTop: 1 }, h(Text, { color: COLORS.muted }, "Everything here is kept unless you tick it.")),
    h(ListDetail, { items, cursor, selected, current, height: 4, columns }),
    files > 0
      ? h(
          Box,
          { paddingTop: 1 },
          h(Text, { color: COLORS.fail }, `${GLYPHS.warn} ${files} file(s) will be deleted permanently.`),
        )
      : null,
  );
}
