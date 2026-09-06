/** @module scripts/reports/census/surface - the runtime surface the census reports on */

import { CORE_ORDER, CORE_PURPOSE, FAMILY_LABEL } from "./_labels.data.mjs";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const DOCS_DIR = process.env.RULE_MCP_CENSUS_DOCS_DIR || join(root, "docs");

const { loadAllSkills, parseSkillFrontmatter } = await import("../../../src/core/skills/index.js");
const { listTools } = await import("../../../src/tools/router/index.js");
const { listResources } = await import("../../../src/resources/index.js");
const { listPrompts } = await import("../../../src/prompts/index.js");
const { commandNames } = await import("../../../src/core/agents/commands/index.js");
const { resolveCommandTargets } = await import("../../../src/core/agents/command-targets/index.js");
const { activeRoles, EMBEDDED_ROLES } = await import("../../../src/core/review/roles/index.js");
const { OPERATIONS } = await import("../../../src/core/review/template/index.js");
export const { buildProgram } = await import("../../../src/cli/program.js");

await loadAllSkills(true);

// ─────────────────────────────────────────────────────────────────────────────
// Runtime surface
// ─────────────────────────────────────────────────────────────────────────────

export const tools = await listTools();
export const resources = await listResources();
export const prompts = await listPrompts();
export const names = commandNames();
export const roles = activeRoles();
export const operations = OPERATIONS;

export const FAMILY_ORDER = ["ai", "backend", "caveman", "data", "devops", "frontend", "platform", "process", "styleguide", "toolchain", "ui"];

export const byFamily = new Map();
for (const family of FAMILY_ORDER) {
  byFamily.set(
    family,
    tools
      .filter((tool) => tool.name.startsWith("rule_tool_" + family))
      .map((tool) => tool.name)
      .sort(),
  );
}
export const perSkill = FAMILY_ORDER.flatMap((family) => byFamily.get(family) ?? []);

export const coreTools = tools
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

export const resourceTotal = resources.length;
export const fullResources = resources.filter((r) => /^rule:\/\/[^/]+$/.test(r.uri));
export const summaryResources = resources.filter((r) => /^rule:\/\/[^/]+\/summary/.test(r.uri));
export const dedicatedResources = resources.filter((r) => !fullResources.includes(r) && !summaryResources.includes(r));

export const routerCommands = names.filter((name) => name === "rule");
export const areaCommands = names.filter((name) => name.startsWith("rule-area-")).sort();
export const sessionCommands = ["rule-handoff", "rule-handon", "rule-init", "rule-process-check", "rule-update"].filter((name) => names.includes(name));
export const personaCommands = names.filter((name) => /^rule-(plan|audit|review)-/.test(name));
export const otherNames = names.filter((name) => !["rule", "rule-adr", "rule-flight", ...areaCommands, ...sessionCommands, ...personaCommands].includes(name));

export const skillDirs = readdirSync(join(root, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

export const skillDescriptions = new Map(
  skillDirs.map((dir) => {
    const meta = parseSkillFrontmatter(readFileSync(join(root, "skills", dir, "SKILL.md"), "utf8"));
    return [dir, meta.description || "(no description)"];
  }),
);

const rooDir = join(root, ".roo", "commands");
export const rooFiles = existsSync(rooDir)
  ? readdirSync(rooDir)
      .filter((name) => name.endsWith(".md"))
      .sort()
  : [];

// ─────────────────────────────────────────────────────────────────────────────

// Rendering helpers (plain strings with literal backticks - no nested templates)
// ─────────────────────────────────────────────────────────────────────────────

export const skillRows = skillDirs.map((dir) => [dir, "`rule-tool-" + dir.replaceAll("_", "-") + "`", skillDescriptions.get(dir)]);

export const promptRows = prompts.map((p) => {
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

export const commandTargets = resolveCommandTargets({ detectedOnly: false }).map((t) => [t.agent, t.format, t.scope, "`" + t.dir + "`"]);
