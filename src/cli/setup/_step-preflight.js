

/**
 * @module cli/setup/step-preflight
 *
 * Step 1: what the wizard found before it offers to change anything.
 *
 * A failed check stops the wizard here. Continuing past a missing Node or an
 * unresolvable binary produces a run where every later step fails for the
 * same reason, which tells the user nothing.
 */

import { Box, Text, h, useInput } from "./_h.js";
import { COLORS, GLYPHS, statusStyle } from "./_theme.js";

/** One check: glyph, label, and what was found. */
function CheckRow({ check }) {
  const style = statusStyle(check.status);

  return h(
    Box,
    null,
    h(Text, { color: style.color }, `${style.glyph} `),
    h(Text, { bold: true }, check.label.padEnd(18)),
    h(Text, { color: COLORS.muted, wrap: "truncate-end" }, check.detail),
  );
}

/**
 * @param {{ checks: object[], blocked: boolean, onSubmit: Function }} props
 */
export function StepPreflight({ checks, blocked, onSubmit }) {
  useInput((input, key) => {
    if (key.return && !blocked) {
      onSubmit();
    }
  });

  return h(
    Box,
    { flexDirection: "column" },
    h(Text, { color: COLORS.accentSoft, bold: true }, "Environment"),
    h(Box, { flexDirection: "column", paddingTop: 1 }, ...checks.map((check) => h(CheckRow, { key: check.id, check }))),
    h(
      Box,
      { paddingTop: 1 },
      blocked
        ? h(Text, { color: COLORS.fail }, `${GLYPHS.fail} Fix the failures above before installing.`)
        : h(Text, { color: COLORS.muted }, `${GLYPHS.arrow} Press Enter to choose which agents to configure.`),
    ),
  );
}
