/**
 * Generate the census docs from the live surface.
 *
 * One generated file per inventory topic, always derived from the registries
 * that define it, never from memory:
 *
 *   docs/07-skills.md        - every skill, with its description and tool
 *   docs/08-tools.md         - every MCP tool (core + per-skill), LLM-free
 *   docs/09-prompts.md       - every MCP prompt, by category
 *   docs/10-instructions.md  - the agent command surface and install targets
 *   docs/11-cli.md           - the full CLI reference (from the commander tree)
 *   docs/12-personas.md      - the persona catalog (src/roles/*.md)
 *
 * plus marker-refreshed blocks in docs/01 (family counts) and docs/05 (env
 * registry). Adding, removing or renaming any surface and running `pnpm census`
 * (wired into prebuild and a pre-commit hook) rewrites these files, so the docs
 * can never drift from the code they describe.
 *
 * Run: pnpm census  (also wired into prebuild and .githooks/pre-commit)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { GENERATED_HEADER, bullets, table, upsertBlock } from "./_markdown.mjs";
import { ENV_VARS } from "./_env-vars.data.mjs";
import { buildCliReference } from "./_cli-reference.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DOCS_DIR = process.env.PIX_CENSUS_DOCS_DIR || join(root, "docs");

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

const byFamily = new Map();
for (const family of FAMILY_ORDER) {
  byFamily.set(
    family,
    tools
      .filter((tool) => tool.name.startsWith("pix_tool_" + family))
      .map((tool) => tool.name)
      .sort(),
  );
}
const perSkill = FAMILY_ORDER.flatMap((family) => byFamily.get(family) ?? []);

const CORE_PURPOSE = new Map(
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
const fullResources = resources.filter((r) => /^pix:\/\/[^/]+$/.test(r.uri));
const summaryResources = resources.filter((r) => /^pix:\/\/[^/]+\/summary/.test(r.uri));
const dedicatedResources = resources.filter((r) => !fullResources.includes(r) && !summaryResources.includes(r));

const routerCommands = names.filter((name) => name === "pix");
const areaCommands = names.filter((name) => name.startsWith("pix-area-")).sort();
const sessionCommands = ["pix-handoff", "pix-handon", "pix-init", "pix-process-check", "pix-update"].filter((name) => names.includes(name));
const personaCommands = names.filter((name) => /^pix-(plan|audit|review)-/.test(name));
const otherNames = names.filter((name) => !["pix", "pix-adr", "pix-flight", ...areaCommands, ...sessionCommands, ...personaCommands].includes(name));

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

// ─────────────────────────────────────────────────────────────────────────────
// Per-inventory generated files (whole files)
// ─────────────────────────────────────────────────────────────────────────────

const skillRows = skillDirs.map((dir) => [dir, "`pix-tool-" + dir.replaceAll("_", "-") + "`", skillDescriptions.get(dir)]);

const promptRows = prompts.map((p) => {
  let category = "one-shot workflow";
  if (p.name === "pix") {
    category = "router";
  } else if (p.name.startsWith("pix-area-")) {
    category = "area";
  } else if (["pix-adr", "pix-flight"].includes(p.name)) {
    category = "area";
  } else if (sessionCommands.includes(p.name)) {
    category = "session";
  } else if (/^pix-(plan|audit|review)-/.test(p.name)) {
    category = "persona";
  }
  return [category, "`" + p.name + "`", p.description || ""];
});

const commandTargets = resolveCommandTargets({ detectedOnly: false }).map((t) => [t.agent, t.format, t.scope, "`" + t.dir + "`"]);

const GENERATED_FILES = [
  {
    file: "07-skills.md",
    title: "# Skills",
    build: () =>
      [
        GENERATED_HEADER,
        "",
        "# Skills (" + skillDirs.length + ")",
        "",
        "Every skill is a `skills/*/SKILL.md` document, registered as a corresponding",
        "`pix-tool-<skill>` MCP tool (see `docs/08-tools.md`).",
        "",
        table(["Skill", "Tool", "Description"], skillRows),
        "",
      ].join("\n"),
  },
  {
    file: "08-tools.md",
    title: "# Tools",
    build: () =>
      [
        GENERATED_HEADER,
        "",
        "# Tools (" + tools.length + ")",
        "",
        "**LLM-free: every tool below is deterministic and never calls an LLM** - the",
        "server is model-agnostic; an LLM is the caller, never the implementation.",
        "",
        "## Core tools (" + coreTools.length + ") - all LLM-free",
        "",
        table(
          ["Tool", "Purpose", "LLM Free"],
          coreTools.map((name) => ["`" + name.replaceAll("_", "-") + "`", CORE_PURPOSE.get(name) ?? "", "✅"]),
        ),
        "",
        "## Per-skill tools (" + perSkill.length + ") - all LLM-free",
        "",
        ...FAMILY_ORDER.flatMap((family) => {
          const familyTools = byFamily.get(family) ?? [];
          return ["### " + FAMILY_LABEL[family] + " (" + familyTools.length + ")", "", bullets(familyTools), ""];
        }),
        "",
      ].join("\n"),
  },
  {
    file: "09-prompts.md",
    title: "# Prompts",
    build: () =>
      [
        GENERATED_HEADER,
        "",
        "# Prompts (" + prompts.length + ")",
        "",
        "Each prompt is exposed over MCP `prompts/get` and generates a clean `/pix-*`",
        "agent command (see `docs/10-instructions.md`). Categories: router, area",
        "(`/pix-area-*` plus `/pix-adr` and `/pix-flight`), session, persona",
        "(`/pix-{plan,audit,review}-<role>`) and the one-shot workflow prompts.",
        "",
        table(["Category", "Prompt", "Description"], promptRows),
        "",
      ].join("\n"),
  },
  {
    file: "10-instructions.md",
    title: "# Instructions",
    build: () =>
      [
        GENERATED_HEADER,
        "",
        "# Instructions: the agent command surface (" + names.length + " commands)",
        "",
        "The `/pix-*` command set is generated from the prompt registry and the",
        "persona catalog, then written into every agent/IDE that has a command",
        "directory. Regenerate or list it with `pix-galaxy-mcp agent-commands`.",
        "",
        table(
          ["Category", "Count"],
          [
            ["Router (`/pix`)", routerCommands.length],
            ["Area / workflow (`/pix-area-*`, `/pix-adr`, `/pix-flight`)", areaCommands.length + 2],
            ["Session (`/pix-handoff`, `/pix-handon`, `/pix-init`, `/pix-process-check`, `/pix-update`)", sessionCommands.length],
            ["Persona (`/pix-{plan,audit,review}-<role>`)", personaCommands.length],
            ["Other", otherNames.length],
          ],
        ),
        "",
        "## Command list",
        "",
        bullets(names),
        "",
        "## Install targets (agent command directories)",
        "",
        table(["Agent", "Format", "Scope", "Directory"], commandTargets),
        "",
        rooFiles.length > 0
          ? [
              "## `.roo/commands/` snapshot (" + rooFiles.length + " files)",
              "",
              "Installed `.md` snapshots for agents that read macros from there; refresh with `pix-galaxy-mcp agent-commands --dir .roo/commands`.",
              "",
              bullets(rooFiles),
              "",
            ].join("\n")
          : "",
      ].join("\n"),
  },
  {
    file: "11-cli.md",
    title: "# CLI",
    build: () => buildCliReference(buildProgram),
  },
  {
    file: "12-personas.md",
    title: "# Personas",
    build: () =>
      [
        GENERATED_HEADER,
        "",
        "# Personas (" + roles.length + " active)",
        "",
        "The persona catalog lives in `src/roles/*.md` (markdown + frontmatter, with a",
        "lenses list in the body) and is read at startup; add or remove a file to add",
        "or remove a persona and its `/pix-{plan,audit,review}-<role>` commands",
        "(see `docs/10-instructions.md`).",
        "",
        table(
          ["Role", "Title", "Years", "Version"],
          roles.map((role) => [role.id, role.role, role.yearsOfExperience, "v" + (role.version ?? 1)]),
        ),
        "",
        "## Lenses, evidence and aliases",
        "",
        ...roles.flatMap((role) => [
          "### " + role.role + " (`" + role.id + "`)",
          "",
          "- **Lenses**: " + (role.lenses ?? []).map((l) => "`" + l + "`").join("; "),
          "- **Evidence skills**: " + (role.evidenceSkills ?? []).map((s) => "`" + s + "`").join(", ") || "-",
          "- **Aliases**: " + (role.aliases ?? []).map((a) => "`" + a + "`").join(", ") || "-",
          "",
        ]),
        "",
      ].join("\n"),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Marker-refreshed blocks in the manual docs
// ─────────────────────────────────────────────────────────────────────────────

const MARKER_TARGETS = [
  {
    file: "01-product-architecture.md",
    marker: "family-counts",
    build: () =>
      [
        "## Tools at a glance (generated census snapshot)",
        "",
        table(
          ["Family", "Count"],
          [
            ["Core tools", coreTools.length],
            ["Per-skill tools (from `skills/*`)", perSkill.length],
            ["`pix://` resources", resourceTotal],
            ["Skills (`skills/*/SKILL.md`)", skillDirs.length],
          ],
        ),
        "",
        "Refresh with `pnpm census`; full inventories in `docs/07-` .. `docs/12-`.",
        "",
      ].join("\n"),
  },
  {
    file: "05-env-variables.md",
    marker: "env-registry",
    build: () => ["## Environment registry (generated census snapshot)", "", table(["Variable", "Effect"], ENV_VARS), "", "Refresh with `pnpm census`.", ""].join("\n"),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Write everything
// ─────────────────────────────────────────────────────────────────────────────

for (const file of GENERATED_FILES) {
  writeFileSync(join(DOCS_DIR, file.file), file.build().trimEnd() + "\n");
  process.stdout.write("Writing " + file.file + "\n");
}

for (const target of MARKER_TARGETS) {
  upsertBlock(join(DOCS_DIR, target.file), target.marker, target.build());
  process.stdout.write("Refreshing " + target.file + " (" + target.marker + ")\n");
}
