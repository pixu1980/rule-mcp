

/**
 * @module cli/setup/step-apply
 *
 * The run itself: one row per task, and the output of the task in flight.
 *
 * The log pane shows the active task's captured output, and the last
 * finished task's once nothing is running. Steps that shell out (skills,
 * doctor) are the slow ones, and a wizard that goes quiet during them looks
 * hung.
 */

import { Box, Text, h } from "./_h.js";
import { COLORS } from "./_theme.js";
import { ProgressBar, TaskRow } from "./_widget-progress.js";

/** The lines to show underneath: the running task's, else the last one's. */
export function logLines(results) {
  const running = results.find((task) => task.status === "running");
  const finished = results.findLast((task) => task.lines?.length > 0);

  return (running?.lines?.length > 0 ? running : finished)?.lines ?? [];
}

/**
 * @param {{ results: object[], activeIndex: number, dryRun: boolean, height: number }} props
 */
export function StepApply({ results, activeIndex, dryRun, height }) {
  const done = results.filter((task) => task.status !== "pending" && task.status !== "running").length;
  const rowHeight = Math.max(4, height - 6);
  const lines = logLines(results).slice(-4);

  return h(
    Box,
    { flexDirection: "column" },
    h(
      Box,
      null,
      h(Text, { color: COLORS.accentSoft, bold: true }, dryRun ? "Dry run" : "Installing"),
      h(Text, { color: COLORS.muted }, "  "),
      h(ProgressBar, { value: done, total: results.length }),
    ),
    h(
      Box,
      { flexDirection: "column", paddingTop: 1 },
      ...results
        .slice(0, rowHeight)
        .map((task, index) => h(TaskRow, { key: task.id, task, active: index === activeIndex })),
    ),
    lines.length > 0
      ? h(
          Box,
          { flexDirection: "column", paddingTop: 1 },
          ...lines.map((line, index) =>
            h(Text, { key: index, color: COLORS.muted, wrap: "truncate-end" }, `  ${line}`),
          ),
        )
      : null,
  );
}
