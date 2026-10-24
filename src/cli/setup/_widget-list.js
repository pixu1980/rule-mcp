/**
 * @module cli/setup/widget-list
 *
 * The scrolling selection list, in checkbox and radio flavors.
 *
 * Windowed rather than full-height: the agent catalog is longer than a short
 * terminal, and a list that overflows the frame pushes the key bar off screen
 * where nobody finds it again.
 */

import { Box, Text, h } from "./_h.js";
import { COLORS, GLYPHS } from "./_theme.js";

/**
 * The slice of items to draw, keeping the cursor inside it.
 *
 * @param {number} total
 * @param {number} cursor
 * @param {number} height
 * @returns {{ start: number, end: number }}
 */
export function windowFor(total, cursor, height) {
  if (total <= height) {
    return { start: 0, end: total };
  }

  const start = Math.min(Math.max(0, cursor - Math.floor(height / 2)), total - height);

  return { start, end: start + height };
}

/** One row: section heading, or a selectable entry. */
function Row({ item, active, selected, mode, first }) {
  if (item.section) {
    // A leading blank above the first heading would push the list out of
    // line with the detail panel beside it.
    return h(Box, { paddingTop: first ? 0 : 1 }, h(Text, { color: COLORS.accentSoft, bold: true }, item.label));
  }

  const mark = mode === "radio" ? (selected ? GLYPHS.radioOn : GLYPHS.radioOff) : selected ? GLYPHS.checked : GLYPHS.unchecked;

  return h(
    Box,
    null,
    h(Text, { color: active ? COLORS.info : COLORS.muted }, active ? `${GLYPHS.pointer} ` : "  "),
    h(Text, { color: selected ? COLORS.ok : COLORS.muted }, `${mark} `),
    h(Text, { color: active ? COLORS.info : undefined, bold: active }, item.label),
    item.note ? h(Text, { color: item.noteColor ?? COLORS.muted }, `  ${item.note}`) : null,
  );
}

/**
 * @param {{ items: object[], cursor: number, selected: Set<string>, mode?: "check"|"radio", height?: number }} props
 */
export function SelectList({ items, cursor, selected, mode = "check", height = 12 }) {
  const { start, end } = windowFor(items.length, cursor, height);
  const rows = items.slice(start, end).map((item, offset) =>
    h(Row, {
      key: item.id ?? `s-${start + offset}`,
      item,
      active: start + offset === cursor,
      selected: selected.has(item.id),
      mode,
      first: offset === 0,
    }),
  );
  const hidden = items.length - (end - start);

  return h(Box, { flexDirection: "column" }, ...rows, hidden > 0 ? h(Text, { color: COLORS.muted }, `  ${GLYPHS.dot} ${hidden} more`) : null);
}

/** The side panel: whatever detail belongs to the row under the cursor. */
export function DetailPanel({ title, lines, width }) {
  return h(
    Box,
    { flexDirection: "column", width, paddingLeft: 2 },
    h(Text, { color: COLORS.accentSoft, bold: true }, title),
    ...lines.map((line, index) => h(Text, { key: index, color: COLORS.muted, wrap: "truncate-end" }, line)),
  );
}

/**
 * The pair every selection screen draws: the windowed list, and the detail of
 * the row under the cursor beside it.
 *
 * One widget rather than six copies of the same twelve lines. `lines` and
 * `width` are overridable because the agents screen appends a line about what
 * the tick will do, and measures its own column.
 *
 * @param {{ items: object[], cursor: number, selected: Set<string>, current?: object, mode?: "check"|"radio", height?: number, columns?: number, width?: number, lines?: string[] }} props
 */
export function ListDetail({ items, cursor, selected, current, mode = "check", height = 12, columns = 80, width, lines }) {
  const row = current ?? items[cursor];

  return h(
    Box,
    { paddingTop: 1 },
    h(Box, { flexDirection: "column", flexGrow: 1 }, h(SelectList, { items, cursor, selected, mode, height })),
    h(DetailPanel, {
      title: row?.label ?? "",
      width: width ?? Math.max(34, Math.floor(columns / 2)),
      lines: lines ?? row?.detail ?? [],
    }),
  );
}
