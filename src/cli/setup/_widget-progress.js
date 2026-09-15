/**
 * @module cli/setup/widget-progress
 *
 * Progress bar, spinner, and the row that reports one task.
 *
 * The spinner is local rather than a dependency: one interval and an index
 * is the whole component, and the installer's dependency list is something
 * users read.
 */

import { Box, Text, h, useEffect, useState } from "./_h.js";
import { COLORS, GLYPHS, statusStyle } from "./_theme.js";

/** A filled bar. Ceiling division so any nonzero progress shows a sliver. */
export function ProgressBar({ value, total, width = 24, color = COLORS.accent }) {
  const filled = total === 0 ? 0 : Math.min(width, Math.ceil((value * width) / total));

  return h(
    Box,
    null,
    h(Text, { color }, GLYPHS.barFull.repeat(filled)),
    h(Text, { color: COLORS.muted }, GLYPHS.barEmpty.repeat(width - filled)),
    h(Text, { color: COLORS.muted }, `  ${value}/${total}`),
  );
}

/** Braille (or ASCII) spinner, 80ms per frame. */
export function Spinner({ color = COLORS.info }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((current) => current + 1), 80);

    return () => clearInterval(timer);
  }, []);

  return h(Text, { color }, GLYPHS.spinner[frame % GLYPHS.spinner.length]);
}

/** One task: glyph, title, and whatever it reported. */
export function TaskRow({ task, active }) {
  const style = statusStyle(task.status);

  return h(
    Box,
    null,
    task.status === "running" ? h(Spinner, null) : h(Text, { color: style.color }, style.glyph),
    h(Text, { color: active ? COLORS.info : undefined, bold: active }, ` ${task.title}`),
    task.summary ? h(Text, { color: COLORS.muted, wrap: "truncate-end" }, `  ${task.summary}`) : null,
  );
}
