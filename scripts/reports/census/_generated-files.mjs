/** @module scripts/reports/census/generated-files - the whole generated docs, one entry per file */

import { GENERATED_HEADER, bullets, table } from "./_markdown.mjs";
import { buildCliReference } from "./_cli-reference.mjs";
import { INSTRUCTIONS_FILE } from "./_instructions-file.mjs";
import { CORE_PURPOSE, FAMILY_LABEL } from "./_labels.data.mjs";
import {
  tools,
  prompts,
  names,
  roles,
  FAMILY_ORDER,
  byFamily,
  perSkill,
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
  INSTRUCTIONS_FILE,
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
