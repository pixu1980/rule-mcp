/**
 * @module core/guardrails/project/checks
 *
 * The project-level guardrail policy: the graph-shaped checks and the
 * threshold each one owns.
 *
 * The engine owns the list, not the adapter: `_run.js` fetches and the
 * `evaluate` function here decides. Adding a check is one entry, and the
 * adapter never learns what a failing graph looks like.
 */

/** The composite quality floor the health check enforces. */
export const HEALTH_FLOOR = 7000;

/**
 * @typedef {Object} ProjectCheck
 * @property {string} id - Rule id, stable and prefixed `project-`
 * @property {string} label - Human-readable rule name
 * @property {string} tool - TokenSave tool to call
 * @property {object} [args] - Tool parameters
 * @property {boolean} [advisory] - Reported, never counted as a failure
 * @property {(value: unknown) => null | { failCount: number, detail: string[], suggestion: string }} evaluate
 */

/** The project checks, in report order. */
export const PROJECT_CHECKS = [
  {
    id: "project-circular",
    label: "No circular file dependencies in src",
    tool: "circular",
    args: {},
    evaluate: (value) => {
      const cycles = Array.isArray(value?.cycles) ? value.cycles : [];
      const relevant = cycles.filter((cycle) => cycle.some((file) => String(file).startsWith("src/")));

      if (relevant.length === 0) {
        return null;
      }

      const first = relevant[0].join(" -> ");

      return {
        failCount: relevant.length,
        detail: [`${relevant.length} circular file dependency cycle(s) touching src/`, `first: ${first}`],
        suggestion: "Break the cycle; `tokensave_imports` names the import statements to cut.",
      };
    },
  },
  {
    id: "project-health",
    label: `Composite quality signal at or above ${HEALTH_FLOOR}`,
    tool: "health",
    args: { path: "src" },
    evaluate: (value) => {
      const score = Number(value?.quality_signal);

      if (Number.isFinite(score) && score >= HEALTH_FLOOR) {
        return null;
      }

      return {
        failCount: 1,
        detail: [Number.isFinite(score) ? `quality signal ${score} is below ${HEALTH_FLOOR}` : "the health tool returned no score"],
        suggestion: "Read the dimensions and fix the lowest score first.",
      };
    },
  },
  {
    id: "project-dead-code",
    label: "No dead symbols in src",
    tool: "dead_code",
    args: { path: "src" },
    evaluate: (value) => {
      const count = Number(value?.dead_code_count) || 0;

      if (count === 0) {
        return null;
      }

      return {
        failCount: count,
        detail: [`${count} symbol(s) with no incoming edge`],
        suggestion: "Remove the symbol or call it; pass `include_public` to audit public items.",
      };
    },
  },
  {
    id: "project-unsafe-patterns",
    label: "No unwrap/expect/panic sites outside tests in src",
    tool: "unsafe_patterns",
    args: { exclude_tests: true, path: "src" },
    evaluate: (value) => {
      const count = Number(value?.match_count) || 0;

      if (count === 0) {
        return null;
      }

      const kinds = Object.entries(value?.by_kind ?? {})
        .map(([kind, n]) => `${kind}: ${n}`)
        .join(", ");

      return {
        failCount: count,
        detail: [`${count} unsafe pattern site(s) outside tests`, ...(kinds ? [kinds] : [])],
        suggestion: "Replace with a checked error path (see rule-backend-security).",
      };
    },
  },
  {
    id: "project-unused-imports",
    label: "No import brought in and never used, in src",
    tool: "unused_imports",
    args: { path: "src" },
    // Advisory: the graph sees the import edge, a person decides whether the
    // side effect it triggers is the reason it is there.
    advisory: true,
    evaluate: (value) => {
      const imports = Array.isArray(value?.imports) ? value.imports : [];

      if (imports.length === 0) {
        return null;
      }

      const sites = imports.slice(0, 5).map((entry) => `${entry.file}:${entry.line} ${entry.unused ?? entry.name}`);

      return {
        failCount: imports.length,
        detail: [`${imports.length} unused import(s)`, ...sites],
        suggestion: "Remove the import, or use it; the graph does not see a reference.",
      };
    },
  },
  {
    id: "project-duplicate-bodies",
    label: "No AST-identical function bodies in src",
    tool: "redundancy",
    args: { path: "src", min_lines: 8 },
    // Advisory: `definite` pairs are AST-identical, but two helpers that agree
    // today are not always one helper.
    advisory: true,
    evaluate: (value) => {
      const pairs = Array.isArray(value?.pairs) ? value.pairs.filter((pair) => pair.severity === "definite") : [];

      if (pairs.length === 0) {
        return null;
      }

      const first = pairs[0];
      const where = first?.a && first.b ? `${first.a.file}:${first.a.line} and ${first.b.file}:${first.b.line}` : "see the tool output";

      return {
        failCount: pairs.length,
        detail: [`${pairs.length} pair(s) with identical bodies`, `first: ${where} (similarity ${first?.similarity ?? "?"})`],
        suggestion: "Keep one and call it, or make the difference explicit; see rule-process-ai.",
      };
    },
  },
  {
    id: "project-diagnostics",
    label: "Type-checker reports no errors",
    tool: "diagnostics",
    args: { scope: "workspace" },
    optional: true,
    evaluate: (value) => {
      const list = value?.diagnostics ?? value?.errors ?? [];
      const errors = Array.isArray(list) ? list.filter((entry) => !entry?.level || entry.level === "error") : [];

      if (errors.length === 0) {
        return null;
      }

      return {
        failCount: errors.length,
        detail: [`${errors.length} type-checker error(s)`],
        suggestion: "Fix the first error; `tokensave_diagnose` maps compiler output to callers.",
      };
    },
  },
];
