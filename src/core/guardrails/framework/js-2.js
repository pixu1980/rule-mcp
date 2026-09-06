// Auto-split from src/core/guardrails/framework.js - see ./framework/index.js

export const JS_GUARDRAILS_PART2 = [
  {
    id: "js-for-loop-braces",
    label: "for loops must have braces and be multi-line",
    description: "Every for/for...of/for...in body must use {} and span multiple lines. No for (...) stmt;",
    check: (code) => {
      // Judged per line: a two-line for over a single statement must not read
      // as a one-liner once the surrounding newlines are trimmed (F-A1).
      const filtered = [];
      const scannable = code.split("\n").filter((l) => l.length > 0 && l.length <= 2000);

      for (const line of scannable) {
        for (const m of line.match(/for\s*\([^)]*\)\s*\{[^}]+\}/g) ?? []) {
          const inner = m
            .replace(/^for\s*\([^)]*\)\s*\{/, "")
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
          suggestion: "Place for loop body on separate lines.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-blank-line-before-return",
    label: "Blank line before return statements",
    description: "Every return statement must have a blank line before it (unless first in block).",
    check: (code) => {
      const issues = [];
      const lines = code.split("\n");

      for (let index = 1; index < lines.length; index++) {
        const line = lines[index].trim();
        const previous = lines[index - 1].trim();

        if (
          (line.startsWith("return ") || line === "return;") &&
          previous !== "" &&
          !previous.endsWith("{") &&
          !previous.endsWith("(") &&
          !previous.startsWith("//") &&
          !previous.startsWith("/*")
        ) {
          issues.push(`Line ${index + 1}: no blank line before return`);
        }
      }

      if (issues.length > 0) {
        return {
          pass: false,
          failCount: issues.length,
          detail: issues.slice(0, 5),
          suggestion: "Add a blank line before each return statement.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-blank-line-between-methods",
    label: "Blank line between class methods",
    description: "Every pair of class methods must have a blank line between them.",
    check: (code) => {
      const issues = [];

      if (!code.includes("class ")) {
        return { pass: true, note: "Not a class - skipping" };
      }

      const lines = code.split("\n");

      for (let index = 0; index < lines.length - 1; index++) {
        // Check if line is a closing brace of a method, followed by another method
        if (/^\s*\}\s*$/.test(lines[index]) && /^\s*(\w+|static|get|set)\s/.test(lines[index + 1])) {
          issues.push(`Line ${index + 1}: no blank line before method`);
        }
      }

      if (issues.length > 0) {
        return {
          pass: false,
          failCount: issues.length,
          detail: issues.slice(0, 5),
          suggestion: "Add a blank line between class methods.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-blank-lines-blocks",
    label: "Multi-line blocks have blank lines above/below",
    description:
      "if/for/while/switch/try/return/promise/method chains spanning >1 line must have a blank line above and below.",
    check: (code) => {
      const issues = [];
      const lines = code.split("\n");

      for (let index = 1; index < lines.length - 1; index++) {
        const line = lines[index];
        const previous = lines[index - 1];
        const next = lines[index + 1];
        // Check if this line starts a block that spans multiple lines
        if (
          /^\s*(if|for|while|switch|try)\s*\(/.test(line) ||
          /^\.(then|catch|finally|map|filter|reduce|forEach)\s*\(/.test(line)
        ) {
          // A line that opens or continues a block (`{`, `} else {`,
          // `} finally {`, `} catch (e) {`) is scaffolding, not a statement
          // that needs separating from the block below it (finding F-A1).
          const previousTrimmed = previous.trim();
          const isScaffolding =
            previousTrimmed === "" ||
            previousTrimmed.endsWith("{") ||
            previousTrimmed.startsWith("}") ||
            /^\s*(\/\/|\/\*|\*|if|for|while|switch|try|case|default)/.test(previous);

          if (!isScaffolding) {
            issues.push(`Line ${index + 1}: no blank line before block`);
          }
        }
        // Check closing brace followed by code
        if (/^\s*\}\s*$/.test(line) && !/catch|else|finally/.test(next)) {
          // `:` `,` `.` and `]` after a closing brace continue an expression
          // (an object literal in a ternary, an argument list, a chain) - the
          // brace closed a value, not a block, and a blank line there splits
          // the expression instead of separating two of them.
          const hasNextCode = next.trim() && !/^\s*(\/\/|\/\*|\*|\}|\)|\]|[:,.]|case|default)/.test(next);

          if (hasNextCode && next.trim() !== "{" && index > 2) {
            // Check this is not the last block in parent
            const afterBlock = lines
              .slice(index + 1)
              .join("\n")
              .trim();

            if (afterBlock && !afterBlock.startsWith("}") && !afterBlock.startsWith(")")) {
              issues.push(`Line ${index + 1}: no blank line after closing brace`);
            }
          }
        }
      }

      if (issues.length > 0) {
        return {
          pass: false,
          failCount: issues.length,
          detail: issues.slice(0, 5),
          suggestion: "Add blank lines around multi-line blocks (see styleguide).",
        };
      }

      return { pass: true };
    },
  },];
