/** @module scripts/reports/census/surface - the runtime surface the census reports on */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DOCS_DIR = process.env.RULE_MCP_CENSUS_DOCS_DIR || join(root, "docs");

const { loadAllSkills, parseSkillFrontmatter } = await import("../../../src/core/skills/_skills.js");
const { listTools } = await import("../../../src/tools/router/index.js");
const { listResources } = await import("../../../src/resources/index.js");
const { listPrompts } = await import("../../../src/prompts/index.js");
const { commandNames } = await import("../../../src/core/agents/_commands.js");
const { resolveCommandTargets } = await import("../../../src/core/agents/_command-targets.js");
const { activeRoles, EMBEDDED_ROLES } = await import("../../../src/core/review/roles/index.js");
const { OPERATIONS } = await import("../../../src/core/review/template/index.js");
const { buildProgram } = await import("../../../src/cli/program.js");

await loadAllSkills(true);

// ─────────────────────────────────────────────────────────────────────────────
// Runtime surface
// ─────────────────────────────────────────────────────────────────────────────

const tools = await listTools();
const resources = await listResources();
const prompts = await listPrompts();
const names = commandNames();
const roles = activeRoles();
const operations = OPERATIONS;

const FAMILY_ORDER = ["ai", "backend", "caveman", "data", "devops", "frontend", "platform", "process", "styleguide", "toolchain", "ui"];
const FAMILY_LABEL = {
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

const byFamily = new Map();
for (const family of FAMILY_ORDER) {
  byFamily.set(
    family,
    tools
      .filter((tool) => tool.name.startsWith("rule_tool_" + family))
      .map((tool) => tool.name)
      .sort(),
  );
}
const perSkill = FAMILY_ORDER.flatMap((family) => byFamily.get(family) ?? []);

const CORE_PURPOSE = new Map(
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
const CORE_ORDER = [...CORE_PURPOSE.keys()];
const coreTools = tools
  .filter((tool) => !perSkill.includes(tool.name))
  .map((tool) => tool.name)
  .sort((a, b) => {
    const ia = CORE_ORDER.indexOf(a);
    const ib = CORE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) {
      return a.localeCompare(b);
    }
    if (ia === -1) {
      return 1;
    }
    if (ib === -1) {
      return -1;
    }
    return ia - ib;
  });

const resourceTotal = resources.length;
const fullResources = resources.filter((r) => /^rule:\/\/[^/]+$/.test(r.uri));
const summaryResources = resources.filter((r) => /^rule:\/\/[^/]+\/summary/.test(r.uri));
const dedicatedResources = resources.filter((r) => !fullResources.includes(r) && !summaryResources.includes(r));

const routerCommands = names.filter((name) => name === "rule");
const areaCommands = names.filter((name) => name.startsWith("rule-area-")).sort();
const sessionCommands = ["rule-handoff", "rule-handon", "rule-init", "rule-process-check", "rule-update"].filter((name) => names.includes(name));
const personaCommands = names.filter((name) => /^rule-(plan|audit|review)-/.test(name));
const otherNames = names.filter((name) => !["rule", "rule-adr", "rule-flight", ...areaCommands, ...sessionCommands, ...personaCommands].includes(name));

const skillDirs = readdirSync(join(root, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

const skillDescriptions = new Map(
  skillDirs.map((dir) => {
    const meta = parseSkillFrontmatter(readFileSync(join(root, "skills", dir, "SKILL.md"), "utf8"));
    return [dir, meta.description || "(no description)"];
  }),
);

const rooDir = join(root, ".roo", "commands");
const rooFiles = existsSync(rooDir)
  ? readdirSync(rooDir)
      .filter((name) => name.endsWith(".md"))
      .sort()
  : [];

// ─────────────────────────────────────────────────────────────────────────────

// Rendering helpers (plain strings with literal backticks - no nested templates)
// ─────────────────────────────────────────────────────────────────────────────

const skillRows = skillDirs.map((dir) => [dir, "`rule-tool-" + dir.replaceAll("_", "-") + "`", skillDescriptions.get(dir)]);

const promptRows = prompts.map((p) => {
  let category = "one-shot workflow";
  if (p.name === "rule") {
    category = "router";
  } else if (p.name.startsWith("rule-area-")) {
    category = "area";
  } else if (["rule-adr", "rule-flight"].includes(p.name)) {
    category = "area";
  } else if (sessionCommands.includes(p.name)) {
    category = "session";
  } else if (/^rule-(plan|audit|review)-/.test(p.name)) {
    category = "persona";
  }
  return [category, "`" + p.name + "`", p.description || ""];
});

const commandTargets = resolveCommandTargets({ detectedOnly: false }).map((t) => [t.agent, t.format, t.scope, "`" + t.dir + "`"]);

export {
  tools,
  resources,
  prompts,
  names,
  roles,
  operations,
  FAMILY_ORDER,
  FAMILY_LABEL,
  byFamily,
  perSkill,
  CORE_PURPOSE,
  CORE_ORDER,
  coreTools,
  resourceTotal,
  fullResources,
  summaryResources,
  dedicatedResources,
  routerCommands,
  areaCommands,
  sessionCommands,
  personaCommands,
  otherNames,
  skillDirs,
  skillDescriptions,
  rooFiles,
  skillRows,
  promptRows,
  commandTargets,
  root,
  DOCS_DIR,
  buildProgram,
};
