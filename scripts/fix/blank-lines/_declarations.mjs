/** @module scripts/fix/blank-lines/declarations - blank lines around returns and declaration groups */

export function fix_returns(lines) {
  const out = [];
  let changed = false;
  const issues = [];
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
      issues.push(index);
    }
  }
  for (let i = 0; i < lines.length; i++) {
    // insert blank BEFORE issue line
    out.push(lines[i]);
    if (issues.includes(i)) {
      // out currently ends with lines[i]; put a blank BEFORE it instead
    }
  }
  // rebuild with blanks before issue indices
  const res = [];
  for (let i = 0; i < lines.length; i++) {
    if (issues.includes(i)) {
      res.push("");
      changed = true;
    }
    res.push(lines[i]);
  }
  return [res, changed];
}

export function fix_const_top(lines) {
  let lastDeclaration = -1;
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
      const out = [...lines];
      out.splice(lastDeclaration + 1, 0, "");
      return [out, true];
    }
  }
  return [lines, false];
}
