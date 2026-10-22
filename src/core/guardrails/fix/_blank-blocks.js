

/** @module scripts/fix/self-guardrails/blank-blocks - js-blank-lines-blocks */

export function apply(text) {
  let changed = false;

  // ── js-blank-lines-blocks ── (blank line BEFORE if/for/... openers unless scaffolding,
  // and AFTER a bare `}` followed by code) ──
  for (let pass = 0; pass < 6; pass++) {
    const ls = text.split("\n");
    const o = [];
    let localChanged = false;

    for (let i = 0; i < ls.length; i++) {
      const line = ls[i];
      const prev = ls[i - 1];
      const next = ls[i + 1];
      const needsBefore = /^\s*(if|for|while|switch|try)\s*\(/.test(line) || /^\s*\.(then|catch|finally|map|filter|reduce|forEach)\s*\(/.test(line);

      if (needsBefore && i > 0 && prev !== undefined) {
        const pt = prev.trim();
        const scaffolding = pt === "" || pt.endsWith("{") || pt.startsWith("}") || /^\s*(\/\/|\/\*|\*|if|for|while|switch|try|case|default)/.test(prev);

        if (!scaffolding) {
          o.push("");
          localChanged = true;
        }
      }

      o.push(line);
      // after `}` followed by code
      if (!/^\s*\}\s*$/.test(line) || next === undefined || /catch|else|finally/.test(next)) {
        continue;
      }

      const nt = next.trim();
      const hasNextCode = nt && !/^\s*(\/\/|\/\*|\*|\}|\)|\]|[:,.]|case|default)/.test(next) && nt !== "{";

      if (!hasNextCode) {
        continue;
      }

      const afterBlock = ls
        .slice(i + 1)
        .join("\n")
        .trim();

      if (!afterBlock || afterBlock.startsWith("}") || afterBlock.startsWith(")")) {
        continue;
      }

      o.push("");
      localChanged = true;
    }

    if (!localChanged) {
      break;
    }

    text = o.join("\n").replaceAll(/\n{3,}/g, "\n\n");

    if (pass === 5) {
      break;
    }
  }

  return { text, changed };
}
