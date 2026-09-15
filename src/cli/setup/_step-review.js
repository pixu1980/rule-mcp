/**
 * @module cli/setup/step-review
 *
 * The last screen before anything is written: the plan, in order, as rows.
 *
 * Dry run is toggled here rather than passed as a flag from outside, so the
 * same screen answers both "what will happen" and "do it for real".
 */

import { Box, Text, h, useInput } from "./_h.js";
import { COLORS, GLYPHS } from "./_theme.js";

/**
 * @param {{ plan: object[], dryRun: boolean, title?: string, danger?: boolean, height: number, onToggleDryRun: Function, onSubmit: Function, onBack: Function }} props
 */
export function StepReview({
  plan,
  dryRun,
  title = "Review",
  danger = false,
  height,
  onToggleDryRun,
  onSubmit,
  onBack,
}) {
  useInput((input, key) => {
    if (input === "d") {
      onToggleDryRun();
    } else if (key.return) {
      onSubmit();
    } else if (key.escape || key.leftArrow) {
      onBack();
    }
  });

  const rows = plan
    .slice(0, height)
    .map((task, index) =>
      h(
        Box,
        { key: task.id },
        h(Text, { color: COLORS.muted }, `${String(index + 1).padStart(2)}. `),
        h(Text, { bold: true }, task.title),
        h(Text, { color: COLORS.muted }, `  ${task.detail}`),
      ),
    );
  const hidden = plan.length - rows.length;

  return h(
    Box,
    { flexDirection: "column" },
    h(Text, { color: danger ? COLORS.warn : COLORS.accentSoft, bold: true }, title),
    h(
      Box,
      { flexDirection: "column", paddingTop: 1 },
      ...rows,
      hidden > 0 ? h(Text, { color: COLORS.muted }, `    ${GLYPHS.dot} ${hidden} more`) : null,
    ),
    h(
      Box,
      { paddingTop: 1 },
      dryRun
        ? h(
            Text,
            { color: COLORS.info },
            `${GLYPHS.radioOn} Dry run - nothing will be written. Press d to arm it for real.`,
          )
        : h(
            Text,
            { color: danger ? COLORS.fail : COLORS.warn },
            `${GLYPHS.warn} Live run - ${plan.length} step(s) will change this machine. Press d for a dry run.`,
          ),
    ),
  );
}
