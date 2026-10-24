/** Guardrail `no-placeholder-implementation`: No placeholder or unfinished implementation */
export const noPlaceholderImplementation = {
  id: "ai-no-placeholder-implementation",
  label: "No placeholder or unfinished implementation",
  description: "Generated code must not contain TODO/FIXME markers, placeholder comments, or not-implemented throws.",
  check: (code) => {
    const patterns = [/\b(?:TODO|FIXME|XXX)\b/gi, /\/\*\s*placeholder\s*\*\//gi, /throw\s+new\s+Error\s*\(\s*["'](?:not implemented|todo)/gi];
    const violations = patterns.flatMap((pattern) => code.match(pattern) || []);

    return {
      pass: violations.length === 0,
      failCount: violations.length,
      detail: violations.slice(0, 10),
      suggestion: "Replace placeholders with complete, executable implementation before returning code.",
    };
  },
};
