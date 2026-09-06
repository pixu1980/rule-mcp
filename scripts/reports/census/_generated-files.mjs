/** @module scripts/reports/census/generated-files - the whole generated docs, one entry per file */

import { GENERATED_HEADER, bullets, table } from "./_markdown.mjs";
import { buildCliReference } from "./_cli-reference.mjs";
import {
  tools,
  prompts,
  names,
  roles,
  FAMILY_ORDER,
  FAMILY_LABEL,
  byFamily,
  perSkill,
  CORE_PURPOSE,
  coreTools,
  routerCommands,
  areaCommands,
  sessionCommands,
  personaCommands,
  otherNames,
  skillDirs,
  rooFiles,
  skillRows,
  promptRows,
  commandTargets,
  buildProgram,
} from "./_surface.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Per-inventory generated files (whole files)
// ─────────────────────────────────────────────────────────────────────────────

export const GENERATED_FILES = [
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
        "`rule-tool-<skill>` MCP tool (see `docs/08-tools.md`).",
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
        "Each prompt is exposed over MCP `prompts/get` and generates a clean `/rule-*`",
        "agent command (see `docs/10-instructions.md`). Categories: router, area",
        "(`/rule-area-*` plus `/rule-adr` and `/rule-flight`), session, persona",
        "(`/rule-{plan,audit,review}-<role>`) and the one-shot workflow prompts.",
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
        "The `/rule-*` command set is generated from the prompt registry and the",
        "persona catalog, then written into every agent/IDE that has a command",
        "directory. Regenerate or list it with `rule-mcp agent-commands`.",
        "",
        table(
          ["Category", "Count"],
          [
            ["Router (`/rule`)", routerCommands.length],
            ["Area / workflow (`/rule-area-*`, `/rule-adr`, `/rule-flight`)", areaCommands.length + 2],
            ["Session (`/rule-handoff`, `/rule-handon`, `/rule-init`, `/rule-process-check`, `/rule-update`)", sessionCommands.length],
            ["Persona (`/rule-{plan,audit,review}-<role>`)", personaCommands.length],
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
              "Installed `.md` snapshots for agents that read macros from there; refresh with `rule-mcp agent-commands --dir .roo/commands`.",
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
        "or remove a persona and its `/rule-{plan,audit,review}-<role>` commands",
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
