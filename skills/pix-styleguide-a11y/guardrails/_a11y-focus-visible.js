/** Guardrail `a11y-focus-visible`: Focus stays visible. */
import { a11yRule, isStyles } from "./_a11y-helpers.js";

export const a11yFocusVisible = a11yRule({
  id: "a11y-focus-visible",
  wcag: "2.4.11",
  label: "Focus stays visible",
  description: "Removing the outline without replacing it leaves keyboard users with no way to see where they are.",
  suggestion: "Keep the outline, or replace it with a visible box-shadow, border or outline in the same rule",
  applies: isStyles,
  // Split on "}" instead of a rule-shaped regex: [^}]*\{ backtracked
  // quadratically on brace runs - the 67 s ReDoS reproducer (F-S1) - and any
  // matchAll over ambiguous classes re-scans brace-less input per position.
  find: (code) => {
    if (!/outline\s*:\s*(?:none|0)\b/i.test(code)) {
      return [];
    }

    const offenders = [];

    for (const chunk of code.split("}")) {
      if (!chunk.includes("{")) {
        continue;
      }

      const rule = `${chunk}}`;

      if (!/outline\s*:\s*(?:none|0)\b/i.test(rule)) {
        continue;
      }

      const rest = rule.replaceAll(/outline\s*:\s*(?:none|0)\b[^;]*;?/gi, "");

      if (!/(?:box-shadow|border(?:-\w+)?\s*:|outline\s*:\s*(?!none|0))/i.test(rest)) {
        offenders.push(rule);
      }
    }

    return offenders;
  },
});
