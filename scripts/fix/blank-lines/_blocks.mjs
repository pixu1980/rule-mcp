/** @module scripts/fix/blank-lines/blocks - blank lines between methods and around blocks */

export function fix_between_methods(lines) {
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

export function fix_blocks(lines) {
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
