

/** Guardrail `js-no-inline-blocks`: Blocks must be multi-line (no inline { code }) */
export const jsNoInlineBlocks = {
  id: "js-no-inline-blocks",
  label: "Blocks must be multi-line (no inline { code })",
  description: "All { } blocks (if/for/while/arrow functions/promises) must span multiple lines. No inline { doThing(); }.",
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
    const matches = code.match(/\b(?:if|for|while|switch|catch)\b\s*\([^\n]*\)\s*\{[^{}\n]+\}|\b(?:try|else)\b\s*\{[^{}\n]+\}|=>\s*\{[^{}\n]+\}/g);

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
};
