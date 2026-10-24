/** @module scripts/fix/self-guardrails/split-one-liners - js-for-loop-braces, js-single-line-method, js-if-braces */

export function apply(text) {
  let changed = false;

  // ── js-for-loop-braces / js-single-line-method: split one-liners ──
  text = text.replaceAll(/(for\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*)\{\s*([^{}\n]+?)\s*\}/g, (m, head, body) => {
    changed = true;

    return `${head}{\n    ${body};\n  }`;
  });
  text = text.replaceAll(/((?:constructor|\w+)\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*)\{\s*([^{}\n]+?)\s*\}/g, (m, head, body) => {
    // never touch `if (...) {` / `for (...) {` / `while (...) {`, handled above only for for; skip if/keywords
    if (/^\s*(if|for|while|switch|catch)\s*/.test(head)) {
      return m;
    }

    changed = true;

    return `${head}{\n    ${body};\n  }`;
  });

  // ── js-if-braces: braceless if/for single statements ──
  text = text.replaceAll(/^(\s*)(if|for|while|switch)\s*\(([^\n]*)\)\s*([^{\n][^\n;]*);?\s*$/gm, (m, ind, kw, cond, stmt) => {
    if (/^\s*\{/.test(stmt)) {
      return m;
    }

    changed = true;

    return `${ind}${kw} (${cond}) {\n${ind}  ${stmt};\n${ind}}`;
  });

  return { text, changed };
}
