

/**
 * @module cli/setup/step-done
 *
 * The closing summary: the tally, whatever went wrong, and what to run next.
 *
 * Failures are listed with their message rather than a count. "2 warnings"
 * sends the user back to scroll the log; the message is the thing they need.
 */

import { Box, Text, h, useInput } from "./_h.js";
import { COLORS, GLYPHS, statusStyle } from "./_theme.js";

/** The `ok 6 · warn 1` line. */
function Tally({ counts }) {
  const parts = ["ok", "warn", "fail", "skip"]
    .filter((status) => counts[status] > 0)
    .flatMap((status, index) => {
      const style = statusStyle(status);
      const cell = h(Text, { key: status, color: style.color }, `${style.glyph} ${counts[status]} ${status}`);

      return index === 0 ? [cell] : [h(Text, { key: `${status}-sep`, color: COLORS.muted }, `  ${GLYPHS.dot}  `), cell];
    });

  return h(Box, null, ...parts);
}

/**
 * @param {{ counts: object, results: object[], dryRun: boolean, nextSteps: string[], onQuit: Function }} props
 */
export function StepDone({ counts, results, dryRun, nextSteps, onQuit }) {
  useInput((input, key) => {
    if (key.return || input === "q") {
      onQuit();
    }
  });

  const problems = results.filter((task) => task.status === "fail" || task.status === "warn");

  return h(
    Box,
    { flexDirection: "column" },
    h(
      Text,
      { color: counts.fail > 0 ? COLORS.warn : COLORS.ok, bold: true },
      dryRun ? "Dry run complete" : counts.fail > 0 ? "Finished with failures" : "Complete",
    ),
    h(Box, { paddingTop: 1 }, h(Tally, { counts })),
    problems.length > 0
      ? h(
          Box,
          { flexDirection: "column", paddingTop: 1 },
          ...problems.map((task) => {
            const style = statusStyle(task.status);

            return h(
              Box,
              { key: task.id },
              h(Text, { color: style.color }, `${style.glyph} `),
              h(Text, null, task.title),
              h(Text, { color: COLORS.muted, wrap: "truncate-end" }, `  ${task.summary}`),
            );
          }),
        )
      : null,
    h(
      Box,
      { flexDirection: "column", paddingTop: 1 },
      h(Text, { color: COLORS.accentSoft, bold: true }, "Next"),
      ...nextSteps.map((line, index) => h(Text, { key: index, color: COLORS.muted }, `  ${GLYPHS.arrow} ${line}`)),
    ),
  );
}
