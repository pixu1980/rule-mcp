/** Guardrail `js-single-line-method`: Class method bodies must be multi-line */
export const jsSingleLineMethod = {
  id: "js-single-line-method",
  label: "Class method bodies must be multi-line",
  description: "Every method body must span multiple lines. No method() { stmt; } on one line.",
  check: (code) => {
    // Judged per line: a 2-line owner over a single statement must not read
    // as a one-liner once the surrounding newlines are trimmed (F-A1), and
    // `\w+\s*\(` stays linear on a long generated line (F-S1).
    const filtered = [];
    const scannable = code.split("\n").filter((l) => l.length > 0 && l.length <= 2000);

    for (const line of scannable) {
      for (const m of line.match(/(?:constructor|\w+)\s*\([^)]*\)\s*\{[^}]+\}/g) ?? []) {
        const inner = m
          .replace(/^\w+\s*\([^)]*\)\s*\{/, "")
          .replace(/\}$/, "")
          .trim();

        if (inner.length > 0) {
          filtered.push(m);
        }
      }
    }

    if (filtered.length > 0) {
      return {
        pass: false,
        failCount: filtered.length,
        detail: filtered.slice(0, 5),
        suggestion: "Split method body across multiple lines.",
      };
    }

    return { pass: true };
  },
};
