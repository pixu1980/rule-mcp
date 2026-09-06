/** @module scripts/reports/census/labels.data - display names and core-tool purposes */

export const FAMILY_LABEL = {
  ai: "rule-ai",
  backend: "rule-backend",
  caveman: "rule-caveman",
  data: "rule-data",
  devops: "rule-devops",
  frontend: "rule-frontend",
  platform: "rule-platform",
  process: "rule-process",
  styleguide: "rule-styleguide",
  toolchain: "rule-toolchain",
  ui: "rule-ui",
};

export const CORE_PURPOSE = new Map(
  Object.entries({
    pix_tool: "Router: routes a prompt to the correct skill and returns the relevant sections",
    rule_tool_update: "MCP server update (fast-forward) + skill hot-reload; restarts when the code changed",
    rule_tool_gateway: "Single-entry orchestrator: prompt to skill evidence to guardrail to receipt",
    rule_tool_apply: "Writes files to disk after gateway validation (requires the receipt; dry-run by default)",
    rule_tool_search: "Semantic BM25 search across every rule skill",
    rule_tool_check: "Guardrail check on a skill; iterate until allPass: true",
    rule_tool_scaffold: "Generates project scaffolding/config files",
    rule_tool_detect: "Detects framework, TypeScript usage and build tooling from package.json",
    rule_tool_compress: "Deterministic prose compression (filler, punctuation, spellings)",
    rule_tool_plan: "Expert persona (security, privacy, simplicity, ...) to plan/audit/review contract",
    rule_tool_plan_docs: "Audit/review/plan bookkeeping (headers, tables, status)",
    rule_tool_stats: "Telemetry: call counts, cache hit rates, saved/estimated tokens, latency",
    rule_tool_usage: "Agent usage sidecar: input/output/cache tokens, USD cost, model",
    rule_tool_a11y_report: "WCAG-EM report from criterion plus audit results",
    rule_tool_fix: "Lint/auto-fix of the project file tree (barrel files, naming, ...)",
    rule_tool_component: "Component/test templates following the rule principles",
  }),
);
export const CORE_ORDER = [...CORE_PURPOSE.keys()];
