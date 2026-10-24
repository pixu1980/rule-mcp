/** Guardrail `verified-dependencies-only`: Only manifest-verified dependencies */
export const verifiedDependenciesOnly = {
  id: "verified-dependencies-only",
  label: "Only manifest-verified dependencies",
  description: "When allowedDependencies context is provided, every external import must exist in that manifest-derived list.",
  check: (code, context) => {
    if (!Array.isArray(context?.allowedDependencies)) {
      return { pass: true, note: "No manifest dependency context supplied, skipping" };
    }

    const allowed = new Set(context.allowedDependencies);
    const specifiers = [...code.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g), ...code.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g)].map(
      (match) => match[1],
    );
    const packages = specifiers
      .filter((name) => !name.startsWith(".") && !name.startsWith("/") && !name.startsWith("node:"))
      .map((name) => (name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/", 1)[0]));
    const unknown = [...new Set(packages.filter((name) => !allowed.has(name)))];

    return {
      pass: unknown.length === 0,
      failCount: unknown.length,
      detail: unknown,
      suggestion: "Use only dependencies declared by the project manifest or add an explicit, reviewed dependency decision.",
    };
  },
};
