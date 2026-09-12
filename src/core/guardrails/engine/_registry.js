/** @module core/guardrails/engine/registry - which rule families apply to which skill */

import { SHARED_GUARDRAILS } from "../shared/index.js";
import { SCAFFOLD_GUARDRAILS } from "../_scaffold.js";
import { BACKEND_GUARDRAILS } from "../backend/index.js";
import { DATABASE_GUARDRAILS } from "../_database.js";
import { FRAMEWORK_GUARDRAILS } from "../framework/index.js";
import { A11Y_GUARDRAILS, QUALITY_GUARDRAILS } from "../quality/index.js";
import { resolveInherited } from "../../layers/_inherit.js";

// ─── Skill-owned guardrails (ADR 079) ───
// Populated once at startup from the resolved skill layers. Read-only after
// that: getGuardrails stays synchronous because the check engine is, and an
// import on the check path would make every call await the filesystem.
let SKILL_RULES = new Map();

/**
 * Install the rules the skills own, as loaded from the three layers.
 *
 * @param {Map<string, { inherits: string[], guardrails: object[] }>} rules
 */
export function setSkillGuardrails(rules) {
  SKILL_RULES = rules instanceof Map ? rules : new Map();
}

/** What a skill owns and inherits, for the inheritance resolver. */
function skillLookup(name) {
  return SKILL_RULES.get(name);
}

/**
 * The rules a skill owns plus the ones it inherits, nearest definition first.
 *
 * @param {string} skillName
 * @returns {object[]}
 */
export function ownedGuardrails(skillName) {
  return SKILL_RULES.has(skillName) ? resolveInherited(skillName, skillLookup).guardrails : [];
}

/**
 * The skills a skill's rules came from, parents first, itself last.
 *
 * @param {string} skillName
 * @returns {string[]}
 */
export function skillChain(skillName) {
  return SKILL_RULES.has(skillName) ? resolveInherited(skillName, skillLookup).chain : [];
}

// ─── Skill → framework mapping ───

export const SKILL_FRAMEWORK_MAP = {
  "rule-frontend-react": "react",
  "rule-frontend-vue": "vue",
  "rule-frontend-svelte": "svelte",
  "rule-frontend-solidjs": "solid",
  "rule-frontend-angular": "angular",
  "rule-frontend-meta-astro": "astro",
  "rule-styleguide": "vanilla",
  "rule-styleguide-html": "vanilla",
  "rule-styleguide-css": "vanilla",
  "rule-styleguide-javascript": "vanilla",
  "rule-styleguide-json": "vanilla",
  "rule-styleguide-markdown": "vanilla",
  "rule-styleguide-a11y": "vanilla",
  "rule-styleguide-naming": "vanilla",
  "rule-styleguide-patterns": "vanilla",
  "rule-styleguide-validation": "vanilla",
  "rule-frontend-vanilla-reactive": "vanilla-reactive",
  rule: "vanilla",
};

// ─── Plugin guardrails registry ───
// Plugins can register custom guardrails via mergePluginGuardrails().
// Key: plugin name (e.g. "my-custom-rule"), Value: array of guardrail objects.
const PLUGIN_GUARDRAILS = new Map();

/**
 * Merge custom guardrails from a plugin into the guardrails engine.
 * Called during loadAllSkills() for each plugin with a plugin.js file.
 *
 * @param {string} pluginName - The plugin directory name
 * @param {Array} guardrails - Array of guardrail objects { id, label, description, check }
 */
export function mergePluginGuardrails(pluginName, guardrails) {
  if (!Array.isArray(guardrails) || guardrails.length === 0) {
    return;
  }

  const existing = PLUGIN_GUARDRAILS.get(pluginName) || [];
  PLUGIN_GUARDRAILS.set(pluginName, [...existing, ...guardrails]);
}

/**
 * The guardrail rule families applicable to a skill: the quality families,
 * shared rules, framework/scaffold rules and the backend/database/devops/a11y
 * groups.
 *
 * @param {string} skillName
 * @param {string} [mode]
 * @returns {Array<object>}
 */
export function getGuardrails(skillName, mode) {
  const framework = SKILL_FRAMEWORK_MAP[skillName] || "vanilla";
  const frameworkSpecific = FRAMEWORK_GUARDRAILS[framework] || [];
  const scaffold = skillName === "rule-styleguide" && mode === "scaffold" ? SCAFFOLD_GUARDRAILS : [];
  const plugin = PLUGIN_GUARDRAILS.get(skillName) || [];

  // Backend guardrails for backend/api skills
  const isBackend = /^rule-(?:backend|backend-)/.test(skillName);
  const backend = isBackend ? BACKEND_GUARDRAILS : [];

  // Database guardrails for data/database skills
  const isDatabase = /^rule-data(?:-|$)/.test(skillName) || skillName.startsWith("rule-data-");
  const database = isDatabase ? DATABASE_GUARDRAILS : [];

  // Accessibility guardrails: the a11y skill always, and any skill checking
  // markup or styles - a React component is as much an a11y surface as a page.
  const isA11y = skillName === "rule-styleguide-a11y" || /^rule-(?:frontend|platform|ui|styleguide)/.test(skillName);
  const a11y = isA11y ? A11Y_GUARDRAILS : [];

  // The skill's own rules come last so that a rule which has moved into a
  // skill overrides the copy the families still carry while ADR 079's
  // migration is in flight.
  const families = [...QUALITY_GUARDRAILS, ...SHARED_GUARDRAILS, ...frameworkSpecific, ...scaffold, ...backend, ...database, ...a11y, ...plugin, ...ownedGuardrails(skillName)];

  // One run per rule id, and the last definition wins: the simplicity rules
  // belong to the quality family AND to the shared set (the simplicity test
  // pins that), and a migrated rule appears in both its family and its skill.
  const byId = new Map();

  for (const guardrail of families) {
    byId.set(guardrail.id, guardrail);
  }

  return [...byId.values()];
}
