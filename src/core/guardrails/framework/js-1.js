// Auto-split from src/core/guardrails/framework.js - see ./framework/index.js

export const JS_GUARDRAILS_PART1 = [
  {
    id: "js-if-braces",
    label: "if/else always use braces",
    description: "Every if, else, else if must use {} braces. Single-line if without braces is forbidden.",
    check: (code) => {
      // Line-oriented on purpose. Balancing parentheses means counting the
      // ones inside regex literals too, and a condition like
      // `/\([^)]*\)/.test(line)` then reads as a braceless if (finding F-A1).
      const offenders = [];
      const lines = code.split("\n");
      for (const [index, raw] of lines.entries()) {
        const line = raw.trim();
        if (!/\bif\s*\(/.test(line) || line.startsWith("*") || line.startsWith("//")) {
          continue;
        }
        if (line.endsWith("{") || /[&|(,+]$/.test(line)) {
          continue;
        }
        if (line.endsWith(")")) {
          const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== "");
          if (next?.trim().startsWith("{")) {
            continue;
          }
        }
        offenders.push(line);
      }
      if (offenders.length > 0) {
        return {
          pass: false,
          failCount: offenders.length,
          detail: offenders.slice(0, 5),
          suggestion: "Add braces: if (condition) { ... }",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-no-inline-blocks",
    label: "Blocks must be multi-line (no inline { code })",
    description:
      "All { } blocks (if/for/while/arrow functions/promises) must span multiple lines. No inline { doThing(); }.",
    check: (code) => {
      // Match if/for/while/try/catch with { code } on the SAME line.
      //
      // Two things this pattern has to get right, and it got both wrong. The
      // leading \b is what stops `for` matching inside `platform`, `before` or
      // `information`; without it any such word followed anywhere by a braced
      // group was a violation, and JSDoc is full of `{HTMLElement}`. And the
      // block body excludes newlines, because a block that spans lines is the
      // thing this rule asks for rather than the thing it forbids.
      // A destructuring pattern in a header (`for (const { a, b } of xs)`) is
      // not an inline block: the block, when there is one, opens AFTER the
      // header's closing parenthesis (finding F-A1).
      const matches = code.match(
        /\b(?:if|for|while|switch|catch)\b\s*\([^\n]*\)\s*\{[^{}\n]+\}|\b(?:try|else)\b\s*\{[^{}\n]+\}|=>\s*\{[^{}\n]+\}/g,
      );

      if (matches && matches.length > 0) {
        const filtered = matches.filter((m) => m !== "=> {}");

        if (filtered.length > 0) {
          return {
            pass: false,
            failCount: filtered.length,
            detail: filtered.slice(0, 5),
            suggestion: "Split block across multiple lines.",
          };
        }
      }

      return { pass: true };
    },
  },
  {
    id: "js-no-blank-lines-in-blocks",
    label: "No blank line immediately after { or before }",
    description: "Blocks must not have blank lines at start or end: {\n\ncode → forbidden. code\n\n} → forbidden.",
    check: (code) => {
      const issues = [];
      const lines = code.split("\n");

      for (let index = 0; index < lines.length; index++) {
        if (/\{\s*$/.test(lines[index]) && index + 1 < lines.length && /^\s*$/.test(lines[index + 1])) {
          issues.push(`Line ${index + 1}: blank line after {`);
        }

        if (/^\s*\}\s*$/.test(lines[index]) && index > 0 && /^\s*$/.test(lines[index - 1])) {
          issues.push(`Line ${index + 1}: blank line before }`);
        }
      }

      if (issues.length > 0) {
        return {
          pass: false,
          failCount: issues.length,
          detail: issues.slice(0, 5),
          suggestion: "Remove blank lines at block start/end.",
        };
      }

      return { pass: true };
    },
  },
  {
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
  },];
