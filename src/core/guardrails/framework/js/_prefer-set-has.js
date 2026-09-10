

/** Guardrail `js-prefer-set-has`: Set.has() over Array.includes() inside loops */
export const jsPreferSetHas = {
  id: "js-prefer-set-has",
  label: "Set.has() over Array.includes() inside loops",
  description:
    "Array.prototype.includes() inside a loop or iteration callback (for/filter/map/some/every/find) is O(n) per call - O(n²) total. Build a Set once and use Set.prototype.has() for O(1) membership.",
  check: (code) => {
    const violations = [];
    const arrayNames = [...code.matchAll(/const\s+(\w+)\s*=\s*\[/g)].map((m) => m[1]);

    if (arrayNames.length === 0) {
      return { pass: true, note: "No array literals found, skipping" };
    }

    const lines = code.split("\n");

    for (const line of lines) {
      const isInIteration = /\bfor\s*\(|\.filter\s*\(|\.map\s*\(|\.some\s*\(|\.every\s*\(|\.find\s*\(|\.findIndex\s*\(/.test(line);

      if (!isInIteration) {
        continue;
      }

      for (const name of arrayNames) {
        if (new RegExp(String.raw`\b${name}\.includes\(`).test(line)) {
          violations.push(line.trim());
          break;
        }
      }
    }
    // Multi-line callbacks: .filter(
    //   x => allowed.includes(x)
    for (const name of arrayNames) {
      const multi = code.match(new RegExp(String.raw`\.(?:filter|map|some|every|find)\s*\([\s\S]{0,200}?\b${name}\.includes\(`, "g"));

      if (multi) {
        violations.push(...multi.map((v) => v.replaceAll("\n", " ").trim().slice(0, 80)));
      }
    }

    if (violations.length === 0) {
      return { pass: true, note: "No includes-in-loop lookups found" };
    }

    return {
      pass: false,
      failCount: violations.length,
      detail: [...new Set(violations)].slice(0, 5),
      suggestion: "Build a Set once outside the loop and use set.has(x): const allowed = new Set([...]); allowed.has(scope).",
    };
  },
};
