

/** @module scripts/fix/self-guardrails/blank-between-methods - js-blank-line-between-methods */

export function apply(text) {
  let changed = false;

  // ── js-blank-line-between-methods ──
  const mid = text.split("\n");
  const midOut = [];
  for (let i = 0; i < mid.length; i++) {
    if (/^\s*\}\s*$/.test(mid[i]) && i + 1 < mid.length && /^\s*(\w+|static|get|set)\s/.test(mid[i + 1]) && !/^\s*(\w+)\s*\([^)]*\)\s*\{[^}]*\}\s*$/.test(mid[i + 1])) {
      midOut.push(mid[i]);
      midOut.push("");
      changed = true;
      continue;
    }
    midOut.push(mid[i]);
  }
  text = midOut.join("\n");

  return { text, changed };
}
