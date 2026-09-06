// Auto-split from src/core/guardrails/framework.js - see ./framework/index.js

export const JS_GUARDRAILS_PART3 = [
  {
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
  },
  {
    id: "js-throw-new-error",
    label: "throw requires new for error constructors",
    description:
      "Errors must be created with new: throw new Error('...'). Calling error constructors as functions (throw Error('...')) is forbidden.",
    check: (code) => {
      const violations =
        code.match(
          /throw\s+(?!new\s+)(?:Error|TypeError|RangeError|SyntaxError|ReferenceError|EvalError|URIError)\s*\(/g,
        ) || [];

      if (violations.length === 0) {
        return { pass: true, note: "No bare error constructor throws found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use new when throwing errors: throw new Error('message').",
      };
    },
  },
  {
    id: "js-new-for-builtins",
    label: "new required for Map/Set/Date/Array/WeakMap/WeakSet",
    description:
      "Builtin constructors Map, Set, Date, Array, WeakMap, WeakSet must be called with new. Calling them as functions (const m = Map()) is forbidden. String, Number, Boolean, Symbol, BigInt are exempt.",
    check: (code) => {
      const violations = [];

      for (const name of ["Map", "Set", "Date", "Array", "WeakMap", "WeakSet"]) {
        const re = new RegExp(String.raw`(?:=|:)\s*${name}\s*\(`, "g");
        let m;

        while ((m = re.exec(code)) !== null) {
          violations.push(m[0].trim());
        }
      }

      if (violations.length === 0) {
        return { pass: true, note: "No bare builtin constructor calls found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use new with builtin constructors: const cache = new Map();",
      };
    },
  },
  {
    id: "js-array-flat-map",
    label: "prefer flatMap over map().flat()",
    description:
      "rows.map(fn).flat() allocates an intermediate array; use rows.flatMap(fn) instead. Only .flat() with no depth argument is flagged.",
    check: (code) => {
      const violations = code.match(/\.map\s*\([^()]*(?:\([^()]*\))?[^()]*\)\s*\.flat\s*\(\s*\)/g) || [];

      if (violations.length === 0) {
        return { pass: true, note: "No map().flat() chains found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use Array.prototype.flatMap: rows.flatMap(r => r.cells).",
      };
    },
  },];
