

/**
 * @module scripts/reports/census/_sections-quality
 *
 * The sections that describe how the server judges code: the persona registry,
 * the guardrail families, and the resource surface.
 */

import { FAMILY_SCOPE } from "./_areas.data.mjs";
import { table } from "./_format.mjs";
import { resourceKinds } from "./_registries.mjs";

/** One role, one axis. */
export function personaSection(data) {
  return [
    "## Review personas",
    "",
    "One role owns one axis, and no lens belongs to two roles. The lifecycle has",
    "two states, `active` and `proposed`; there is no `deprecated`.",
    "",
    ...table(
      ["Role", "Title", "Years", "Lenses", "Status", "Evidence skills"],
      data.roles.map((role) => [
        `\`${role.id}\``,
        role.role,
        role.yearsOfExperience,
        (role.lenses ?? []).length,
        role.status,
        (role.evidenceSkills ?? []).map((skill) => `\`${skill}\``).join(", ") || "-",
      ]),
    ),
    "",
    "## Lenses and aliases",
    "",
    "A lens is what the role looks through; an alias is what a request may call",
    "it, and resolving one is how a free-text ask reaches the right persona.",
    "",
    ...data.roles.flatMap((role) => [
      `### ${role.role} (\`${role.id}\`)`,
      "",
      `- **Lenses**: ${(role.lenses ?? []).map((lens) => `\`${lens}\``).join("; ") || "-"}`,
      `- **Aliases**: ${(role.aliases ?? []).map((alias) => `\`${alias}\``).join(", ") || "-"}`,
      "",
    ]),
  ];
}

/** Every rule, with what it rejects, grouped by the family that carries it. */
export function guardrailSection(data) {
  const rules = new Map();

  for (const [family, list] of data.families) {
    for (const rule of list) {
      rules.set(rule.id, { rule, families: [...(rules.get(rule.id)?.families ?? []), family] });
    }
  }

  return [
    `## Guardrail rules (${data.guardrailIds.size} distinct)`,
    "",
    "Deterministic and advisory checks, run by `rule_tool_check` and by the",
    "repository against itself. An advisory rule reports and never fails. A rule",
    "can belong to more than one family, so the family counts sum to more than the",
    "distinct total, and a check names the skill it runs for: the shared rules",
    "always, plus whatever that skill's area adds.",
    "",
    ...table(
      ["Family", "Rules", "Applies to"],
      data.families.map(([name, list]) => [`[\`${name}\`](#${name.replace(":", "")})`, list.length, FAMILY_SCOPE[name] ?? ""]),
    ),
    "",
    ...data.families.flatMap(([family, list]) => [
      `### ${family}`,
      "",
      ...table(
        ["Rule", "Label", "What it rejects", "Also in"],
        list.map((rule) => [`\`${rule.id}\``, rule.label ?? "", rule.description ?? "", (rules.get(rule.id)?.families ?? []).filter((name) => name !== family).join(", ") || "-"]),
      ),
      "",
    ]),
  ];
}

/** The fixed resources, and the pair every skill mints. */
export function resourceSection(data) {
  const kinds = resourceKinds(data.resources, data.skillDirs);

  return [
    `## MCP resources (${data.resources.length})`,
    "",
    "A resource is read with `resources/read`, and every one is JSON or markdown",
    "a client can cache: no call runs a model, and none of them writes.",
    "",
    "### The fixed indexes",
    "",
    ...table(
      ["URI", "Name", "Media type"],
      kinds.fixed.map((resource) => [`\`${resource.uri}\``, resource.name ?? "-", `\`${resource.mimeType ?? "-"}\``]),
    ),
    "",
    "### Per skill",
    "",
    `${kinds.perSkill} more, two for each skill that mints them:`,
    "",
    "- `rulemcp://<skill>` - the whole `SKILL.md`",
    "- `rulemcp://<skill>/summary` - the condensed form a router hands back",
    "",
    "Listing them one row at a time would restate [`09-skills.md`](09-skills.md).",
    "",
  ];
}
