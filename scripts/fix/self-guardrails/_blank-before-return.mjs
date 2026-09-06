/** @module scripts/fix/self-guardrails/blank-before-return - js-blank-line-before-return */

export function apply(text) {
  let changed = false;

  // ── js-blank-line-before-return ──
  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      (line.startsWith("return ") || line === "return;") &&
      i > 0 &&
      out.length > 0 &&
      out.at(-1).trim() !== "" &&
      !out.at(-1).trimEnd().endsWith("{") &&
      !out.at(-1).trimEnd().endsWith("(") &&
      !/^\s*(\/\/|\/\*)/.test(out.at(-1))
    ) {
      out.push("");
      changed = true;
    }
    out.push(lines[i]);
  }
  text = out.join("\n");

  return { text, changed };
}
