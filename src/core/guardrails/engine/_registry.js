

/** @module core/guardrails/engine/registry - which rule families apply to which skill */

import { SCAFFOLD_GUARDRAILS } from "../_scaffold.js";
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

/**
 * The skills whose rules every check includes (ADR 079).
 *
 * These are the baseline: the naming, prose, comment, simplicity and markup
 * rules that applied to every skill before the rules moved into the skills
 * that own them. They are named here rather than inherited by each of the 91
 * SKILL.md files because a baseline every skill inherits cannot also be a set
 * of skills that inherit the baseline - the graph would be a cycle, and a
 * cycle the resolver has to break is not a declaration anybody can read.
 */
export const BASELINE_SKILLS = [
  "rule-styleguide-css",
  "rule-styleguide-html",
  "rule-styleguide-javascript",
  "rule-styleguide-naming",
  "rule-styleguide-file-tree",
  "rule-styleguide-a11y",
  "rule-styleguide-fingerprint",
  "rule-styleguide-english",
  "rule-styleguide-comments",
  "rule-styleguide-typescript",
  "rule-process-simplicity",
  "rule-toolchain-pnpm",
];

// ─── Skill -> framework mapping ───

export const SKILL_FRAMEWORK_MAP = {
  "rule-frontend-react": "react",
  "rule-frontend-vue": "vue",
  "rule-frontend-svelte": "svelte",
  "rule-frontend-solidjs": "solid",
  "rule-frontend-angular": "angular",
  "rule-meta-astro": "astro",
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
  const scaffold = skillName === "rule-styleguide" && mode === "scaffold" ? SCAFFOLD_GUARDRAILS : [];
  const plugin = PLUGIN_GUARDRAILS.get(skillName) || [];

  // The skill's own rules come last so that a rule which has moved into a
  // skill overrides the copy the families still carry while ADR 079's
  // migration is in flight.
  const baseline = BASELINE_SKILLS.flatMap((name) => (name === skillName ? [] : ownedGuardrails(name)));
  const families = [...baseline, ...scaffold, ...plugin, ...ownedGuardrails(skillName)];

  // One run per rule id, and the last definition wins: the simplicity rules
  // belong to the quality family AND to the shared set (the simplicity test
  // pins that), and a migrated rule appears in both its family and its skill.
  const byId = new Map();

  for (const guardrail of families) {
    byId.set(guardrail.id, guardrail);
  }

  return [...byId.values()];
}
