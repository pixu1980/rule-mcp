

/**
 * @module scripts/reports/census/_gather
 *
 * Read every registry once, and hand the sections one object.
 *
 * Each section used to call the registries itself, which meant the same list
 * was walked several times and a count could disagree with the table beneath
 * it. Gathering first makes that impossible.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { areaOf, toolOf } from "./_format.mjs";
import {
  ROOT,
  allRoles,
  bootstrapCoreTools,
  commandNames,
  guardrailFamilies,
  listExistingAdrs,
  listPrompts,
  listResources,
  listTools,
  loadAllSkills,
  parsePersonaName,
} from "./_registries.mjs";

/**
 * Everything the census counts, read once.
 *
 * @returns {Promise<object>} the gathered surface
 */
export async function gather() {
  await loadAllSkills(true);
  // The core tools the invocation path owns are registered at startup, not by
  // the catalog, so the surface a reader is told about is only complete after
  // the same bootstrap the server runs.
  await bootstrapCoreTools();

  const tools = await listTools();
  const resources = await listResources();
  const prompts = await listPrompts();
  const roles = allRoles();
  const commands = commandNames();
  const adrs = listExistingAdrs(join(ROOT, "docs", "adr"));
  const skillDirs = readdirSync(join(ROOT, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(ROOT, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const catalog = skillDirs.filter((name) => name.startsWith("rule-"));
  const skillToolNames = new Set(catalog.map((name) => toolOf(name)));
  const families = guardrailFamilies();
  const areas = new Map();

  for (const name of catalog) {
    const area = areaOf(name);
    areas.set(area, [...(areas.get(area) ?? []), name]);
  }

  return {
    adrs,
    areas,
    catalog,
    commands,
    families,
    guardrailIds: new Set(families.flatMap(([, rules]) => rules.map((rule) => rule.id))),
    actionTools: tools.filter((tool) => !skillToolNames.has(tool.name)),
    skillTools: tools.filter((tool) => skillToolNames.has(tool.name)),
    personaPrompts: prompts.filter((prompt) => parsePersonaName(prompt.name)),
    reusablePrompts: prompts.filter((prompt) => !parsePersonaName(prompt.name)),
    prompts,
    resources,
    roles,
    skillDirs,
    tools,
  };
}
