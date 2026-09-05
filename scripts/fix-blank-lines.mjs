/**
 * Rule-exact self-guardrails fixer: mirrors the DETECTORS in
 * framework.js/shared.js so it inserts a blank line exactly where the rule
 * reports one, and nowhere else. Run: node scripts/fix-blank-lines.mjs --safe
 * <files...>
 */
import { readFileSync, writeFileSync } from "node:fs";

const SAFE = process.argv.includes("--safe");
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));

function fix_returns(lines) {
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

function fix_const_top(lines) {
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

function fix_between_methods(lines) {
  const issues = [];
  if (lines.join("\n").includes("class ")) {
    for (let index = 0; index < lines.length - 1; index++) {
      if (/^\s*\}\s*$/.test(lines[index]) && /^\s*(\w+|static|get|set)\s/.test(lines[index + 1])) {
        issues.push(index);
      }
    }
  }
  if (issues.length === 0) {
    return [lines, false];
  }
  const out = [];
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    if (issues.includes(i)) {
      out.push("");
      changed = true;
    }
  }
  return [out, changed];
}

function fix_blocks(lines) {
  const issuesBefore = [];
  const issuesAfter = [];
  for (let index = 1; index < lines.length - 1; index++) {
    const line = lines[index];
    const previous = lines[index - 1];
    const next = lines[index + 1];
    if (
      /^\s*(if|for|while|switch|try)\s*\(/.test(line) ||
      /^\.(then|catch|finally|map|filter|reduce|forEach)\s*\(/.test(line)
    ) {
      const previousTrimmed = previous.trim();
      const isScaffolding =
        previousTrimmed === "" ||
        previousTrimmed.endsWith("{") ||
        previousTrimmed.startsWith("}") ||
        /^\s*(\/\/|\/\*|\*|if|for|while|switch|try|case|default)/.test(previous);
      if (!isScaffolding) {
        issuesBefore.push(index);
      }
    }
    if (/^\s*\}\s*$/.test(line) && !/catch|else|finally/.test(next)) {
      const hasNextCode = next.trim() && !/^\s*(\/\/|\/\*|\*|\}|\)|\]|[:,.]|case|default)/.test(next);
      if (hasNextCode && next.trim() !== "{" && index > 2) {
        const afterBlock = lines
          .slice(index + 1)
          .join("\n")
          .trim();
        if (afterBlock && !afterBlock.startsWith("}") && !afterBlock.startsWith(")")) {
          issuesAfter.push(index);
        }
      }
    }
  }
  if (issuesBefore.length === 0 && issuesAfter.length === 0) {
    return [lines, false];
  }
  const out = [];
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (issuesBefore.includes(i)) {
      out.push("");
      changed = true;
    }
    out.push(lines[i]);
    if (issuesAfter.includes(i)) {
      out.push("");
      changed = true;
    }
  }
  return [out, changed];
}

let touched = 0;
for (const file of files) {
  let lines = readFileSync(file, "utf8").split("\n");
  let any = false;
  for (const pass of [fix_returns, fix_const_top, fix_between_methods, fix_blocks]) {
    const [out, changed] = pass(lines);
    lines = out;
    any ||= changed;
  }
  const fixed = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  if (any && fixed !== readFileSync(file, "utf8")) {
    writeFileSync(file, fixed);
    touched++;
    console.log("fixed", file);
  }
}
console.log(`${touched} files updated`);
