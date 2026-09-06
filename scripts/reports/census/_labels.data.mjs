/** @module scripts/reports/census/labels.data - display names and core-tool purposes */

export const FAMILY_LABEL = {
  ai: "pix-ai",
  backend: "pix-backend",
  caveman: "pix-caveman",
  data: "pix-data",
  devops: "pix-devops",
  frontend: "pix-frontend",
  platform: "pix-platform",
  process: "pix-process",
  styleguide: "pix-styleguide",
  toolchain: "pix-toolchain",
  ui: "pix-ui",
};

export const CORE_PURPOSE = new Map(
  Object.entries({
    pix_tool: "Router: routes a prompt to the correct skill and returns the relevant sections",
    pix_tool_update: "MCP server update (fast-forward) + skill hot-reload; restarts when the code changed",
    pix_tool_gateway: "Single-entry orchestrator: prompt to skill evidence to guardrail to receipt",
    pix_tool_apply: "Writes files to disk after gateway validation (requires the receipt; dry-run by default)",
    pix_tool_search: "Semantic BM25 search across every pix skill",
    pix_tool_check: "Guardrail check on a skill; iterate until allPass: true",
    pix_tool_scaffold: "Generates project scaffolding/config files",
    pix_tool_detect: "Detects framework, TypeScript usage and build tooling from package.json",
    pix_tool_compress: "Deterministic prose compression (filler, punctuation, spellings)",
    pix_tool_plan: "Expert persona (security, privacy, simplicity, ...) to plan/audit/review contract",
    pix_tool_plan_docs: "Audit/review/plan bookkeeping (headers, tables, status)",
    pix_tool_stats: "Telemetry: call counts, cache hit rates, saved/estimated tokens, latency",
    pix_tool_usage: "Agent usage sidecar: input/output/cache tokens, USD cost, model",
    pix_tool_a11y_report: "WCAG-EM report from criterion plus audit results",
    pix_tool_fix: "Lint/auto-fix of the project file tree (barrel files, naming, ...)",
    pix_tool_component: "Component/test templates following the pix principles",
  }),
);
export const CORE_ORDER = [...CORE_PURPOSE.keys()];
