/** Guardrail `js-const-top`: Variable declarations grouped at top */
export const jsConstTop = {
  id: "js-const-top",
  label: "Variable declarations grouped at top",
  description:
    "const/let/var declarations should be grouped at the top of their scope, separated from code by a blank line.",
  check: (code) => {
    const lines = code.split("\n");
    let lastDeclaration = -1;
    // A declaration can span lines (an arrow function, an object literal, a
    // template string). Its continuation lines belong to the declaration, so
    // the separator this rule asks for goes after the statement ENDS - not
    // after its first line, which used to flag every multi-line const in the
    // repository (finding F-A1).
    for (let index = 0; index < lines.length; index++) {
      if (!/^(const|let|var)\s/.test(lines[index].trim())) {
        continue;
      }

      let depth = 0;
      let end = index;

      for (; end < lines.length; end++) {
        for (const char of lines[end]) {
          if ("({[".includes(char)) {
            depth += 1;
          } else if (")}]".includes(char)) {
            depth -= 1;
          }
        }
        // A statement ends at its semicolon. Bracket balance alone stops at
        // the first line of a multi-line ternary, which has no brackets at
        // all and would ask for a blank line inside the expression.
        if (depth <= 0 && lines[end].trimEnd().endsWith(";")) {
          break;
        }
      }

      lastDeclaration = Math.min(end, lines.length - 1);
      index = lastDeclaration;
    }

    if (lastDeclaration > 0 && lastDeclaration < lines.length - 1) {
      const nextLine = lines[lastDeclaration + 1].trim();

      if (nextLine && !/^(\/\/|\/\*|\*|export|import|'use strict'|}|case|default)/.test(nextLine)) {
        return {
          pass: false,
          failCount: 1,
          detail: [`Line ${lastDeclaration + 1}: no blank line after declarations`],
          suggestion: "Add a blank line after the last const/let/var declaration.",
        };
      }
    }

    return { pass: true };
  },
};
