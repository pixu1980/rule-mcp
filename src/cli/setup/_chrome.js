

/**
 * @module cli/setup/chrome
 *
 * The frame every step renders inside: title bar, step rail, body, key bar.
 *
 * One frame for all steps is what makes this read as a wizard rather than a
 * sequence of prompts. The rail never moves, so the user can see how far in
 * they are and what is still ahead.
 */

import { Box, Text, h } from "./_h.js";
import { BORDER, COLORS, GLYPHS } from "./_theme.js";
import { pkg } from "../paths/index.js";

/** The step rail: done steps dim, the active one accented, the rest muted. */
export function Stepper({ steps, active }) {
  const cells = steps.flatMap((step, index) => {
    const state = index === active ? "active" : index < active ? "done" : "ahead";
    const color = state === "active" ? COLORS.info : state === "done" ? COLORS.ok : COLORS.muted;
    const marker = state === "done" ? GLYPHS.ok : state === "active" ? GLYPHS.radioOn : GLYPHS.radioOff;
    const cell = h(Text, { key: step, color, bold: state === "active" }, `${marker} ${step}`);

    return index === 0 ? [cell] : [h(Text, { key: `${step}-sep`, color: COLORS.muted }, "  "), cell];
  });

  return h(Box, null, ...cells);
}

/** The key hints along the bottom, rendered as `key action` pairs. */
export function KeyBar({ hints }) {
  const cells = hints.flatMap(([key, action], index) => {
    const pair = [
      h(Text, { key: `${key}-k`, color: COLORS.accentSoft, bold: true }, key),
      h(Text, { key: `${key}-a`, color: COLORS.muted }, ` ${action}`),
    ];

    return index === 0 ? pair : [h(Text, { key: `${key}-sep`, color: COLORS.muted }, `  ${GLYPHS.dot}  `), ...pair];
  });

  return h(Box, null, ...cells);
}

/**
 * The full-viewport shell.
 *
 * @param {{ title: string, subtitle?: string, steps: string[], active: number, hints: Array<[string, string]>, rows: number, columns: number, children: any }} props
 */
export function Frame({ title, subtitle, steps, active, hints, rows, columns, children }) {
  return h(
    Box,
    { flexDirection: "column", width: columns, height: rows },
    h(
      Box,
      { borderStyle: BORDER, borderColor: COLORS.accent, paddingX: 1, justifyContent: "space-between" },
      h(
        Box,
        null,
        h(Text, { color: COLORS.accent, bold: true }, "rule-mcp"),
        h(Text, { color: COLORS.muted }, `  ${GLYPHS.dot}  `),
        h(Text, { color: COLORS.info }, title),
        subtitle ? h(Text, { color: COLORS.muted }, `  ${subtitle}`) : null,
      ),
      h(Text, { color: COLORS.muted }, `v${pkg.version}`),
    ),
    h(Box, { paddingX: 2, paddingY: 0 }, h(Stepper, { steps, active })),
    h(Box, { flexGrow: 1, flexDirection: "column", paddingX: 2, paddingTop: 1, overflow: "hidden" }, children),
    h(Box, { borderStyle: BORDER, borderColor: COLORS.muted, paddingX: 1 }, h(KeyBar, { hints })),
  );
}
