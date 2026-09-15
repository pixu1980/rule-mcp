

/** Guardrail `js-blank-lines-blocks`: Multi-line blocks have blank lines above/below */

export const jsBlankLinesBlocks = {
  id: "js-blank-lines-blocks",
  label: "Multi-line blocks have blank lines above/below",
  description: "if/for/while/switch/try/return/promise/method chains spanning >1 line must have a blank line above and below.",
  check: (code, { helpers: { countedVerdict } }) => {
    const issues = [];
    const lines = code.split("\n");

    for (let index = 1; index < lines.length - 1; index++) {
      const line = lines[index];
      const previous = lines[index - 1];
      const next = lines[index + 1];
      // Check if this line starts a block that spans multiple lines
      if (/^\s*(if|for|while|switch|try)\s*\(/.test(line) || /^\.(then|catch|finally|map|filter|reduce|forEach)\s*\(/.test(line)) {
        // A line that opens or continues a block (`{`, `} else {`,
        // `} finally {`, `} catch (e) {`) is scaffolding, not a statement
        // that needs separating from the block below it (finding F-A1).
        const previousTrimmed = previous.trim();
        const isScaffolding =
          previousTrimmed === "" || previousTrimmed.endsWith("{") || previousTrimmed.startsWith("}") || /^\s*(\/\/|\/\*|\*|if|for|while|switch|try|case|default)/.test(previous);

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
      return countedVerdict(issues, { suggestion: "Add blank lines around multi-line blocks (see styleguide)." });
    }

    return { pass: true };
  },
};
