/**
 * rule-mcp Guardrails Engine
 *
 * Public API for guardrails: getGuardrails, checkCode, getGuardrailsReport.
 * Guardrail definitions live in guardrail-defs.js (imported below).
 *
 * The agent iterates: generate → check → fix → re-check → until all pass.
 */

import {
  SHARED_GUARDRAILS,
  FRAMEWORK_GUARDRAILS,
  SCAFFOLD_GUARDRAILS,
  ARCHITECT_GUARDRAILS,
  BACKEND_GUARDRAILS,
  DATABASE_GUARDRAILS,
  DEVOPS_GUARDRAILS,
} from "./guardrail-defs.js";

// ─── Framework aliases ───

const FRAMEWORK_ALIASES = {
  react: ["react", "reactjs", "react.js", "jsx"],
  vue: ["vue", "vuejs", "vue.js", "vue3"],
  svelte: ["svelte", "sveltejs", "svelte5"],
  angular: ["angular", "angularjs", "ng"],
  solid: ["solid", "solidjs"],
  astro: ["astro"],
  vanilla: ["vanilla", "vanilla-js", "js", "javascript"],
};

// eslint-disable-next-line no-unused-vars
function resolveFramework(framework) {
  if (!framework) {
    return "vanilla";
  }
  const f = framework.toLowerCase();
  for (const [key, aliases] of Object.entries(FRAMEWORK_ALIASES)) {
    if (aliases.includes(f) || key === f) {
      return key;
    }
  }
  return "vanilla";
}

// ─── Skill → framework mapping ───

const SKILL_FRAMEWORK_MAP = {
  "rule-frontend-react": "react",
  "rule-frontend-vue": "vue",
  "rule-frontend-svelte": "svelte",
  "rule-frontend-solidjs": "solid",
  "rule-frontend-angular": "angular",
  "rule-frontend-astro": "astro",
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
  "rule-architect": "architect",
};

// ─── Plugin guardrails registry ───
// Plugins can register custom guardrails via mergePluginGuardrails().
// Key: plugin name (e.g. "my-custom-rule"), Value: array of guardrail objects.
const PLUGIN_GUARDRAILS = new Map();

/**
 * Merge custom guardrails from a plugin into the guardrails engine.
 * Called during loadAllSkills() for each plugin with a plugin.js file.
 *
 * @param {string} pluginName — The plugin directory name
 * @param {Array} guardrails — Array of guardrail objects { id, label, description, check }
 */
export function mergePluginGuardrails(pluginName, guardrails) {
  if (!Array.isArray(guardrails) || guardrails.length === 0) {
    return;
  }
  const existing = PLUGIN_GUARDRAILS.get(pluginName) || [];
  PLUGIN_GUARDRAILS.set(pluginName, [...existing, ...guardrails]);
}

// ─── Public API ───

export function getGuardrails(skillName, mode) {
  const framework = SKILL_FRAMEWORK_MAP[skillName] || "vanilla";
  const frameworkSpecific = FRAMEWORK_GUARDRAILS[framework] || [];
  const scaffold = skillName === "rule-styleguide" && mode === "scaffold" ? SCAFFOLD_GUARDRAILS : [];
  const architect = skillName === "rule-architect" ? ARCHITECT_GUARDRAILS : [];
  const plugin = PLUGIN_GUARDRAILS.get(skillName) || [];

  // Backend guardrails for backend/api skills
  const isBackend = /^rule-(?:backend|backend-)/.test(skillName);
  const backend = isBackend ? BACKEND_GUARDRAILS : [];

  // Database guardrails for data/database skills
  const isDatabase = /^rule-data(?:-|$)/.test(skillName) || skillName.startsWith("rule-data-");
  const database = isDatabase ? DATABASE_GUARDRAILS : [];

  // DevOps guardrails for devops skills
  const isDevops = /^rule-devops(?:-|$)/.test(skillName);
  const devops = isDevops ? DEVOPS_GUARDRAILS : [];

  return [
    ...SHARED_GUARDRAILS,
    ...frameworkSpecific,
    ...scaffold,
    ...architect,
    ...backend,
    ...database,
    ...devops,
    ...plugin,
  ];
}

export function checkCode(skillName, code, context = {}) {
  const guardrails = getGuardrails(skillName, context?.mode);
  const previousPassed = new Set(); // ← always start fresh — no client bypass

  const results = guardrails.map((g) => {
    if (previousPassed.has(g.id)) {
      return {
        id: g.id,
        label: g.label,
        pass: true,
        failCount: 0,
        detail: [],
        suggestion: "",
        note: "Skipped — previously passed",
        skipped: true,
      };
    }
    const result = g.check(code, context);
    return {
      id: g.id,
      label: g.label,
      pass: result.pass,
      failCount: result.failCount || 0,
      detail: result.detail || [],
      suggestion: result.suggestion || "",
      note: result.note || "",
      skipped: false,
    };
  });

  const passed = results.filter((r) => r.pass && !r.skipped);
  const failed = results.filter((r) => !r.pass);
  const skipped = results.filter((r) => r.skipped);

  const newPassed = [...passed.map((r) => r.id)];

  return {
    skill: skillName,
    total: guardrails.length,
    passCount: passed.length,
    failCount: failed.length,
    skippedCount: skipped.length,
    passed: passed.map((r) => ({ id: r.id, label: r.label })),
    failed: failed.map((r) => ({
      id: r.id,
      label: r.label,
      failCount: r.failCount,
      detail: r.detail,
      suggestion: r.suggestion,
    })),
    skipped: skipped.map((r) => ({ id: r.id, label: r.label })),
    summary:
      failed.length === 0
        ? `✅ All ${guardrails.length} guardrails pass for ${skillName} (${skipped.length} skipped from previous iteration).`
        : `❌ ${failed.length}/${guardrails.length} guardrails FAIL for ${skillName} (${skipped.length} skipped from previous). Fix then re-check.`,
    allPass: failed.length === 0,
    previousPassed: newPassed,
  };
}

export function getGuardrailsReport(skillName, mode) {
  const guardrails = getGuardrails(skillName, mode);
  const lines = [
    `# Guardrails: ${skillName}`,
    "",
    `Total: ${guardrails.length} testable assertions`,
    "",
    "## Shared (all rule skills)",
    "",
  ];
  for (const g of SHARED_GUARDRAILS) {
    lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
  }

  const framework = SKILL_FRAMEWORK_MAP[skillName];
  const fg = FRAMEWORK_GUARDRAILS[framework] || [];
  if (fg.length > 0) {
    lines.push(`## Framework-specific (${framework})`, "");
    for (const g of fg) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
  }

  if (skillName === "rule-styleguide") {
    lines.push(`## Project Scaffolding (${SCAFFOLD_GUARDRAILS.length} config files)`, "");
    for (const g of SCAFFOLD_GUARDRAILS) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
    lines.push("Run `pix_styleguide mode=scaffold` to generate these files.", "");
  }

  if (skillName === "rule-architect") {
    lines.push(`## Architecture & Documentation (${ARCHITECT_GUARDRAILS.length} checks)`, "");
    for (const g of ARCHITECT_GUARDRAILS) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
  }

  if (/^rule-(?:backend|backend-)/.test(skillName)) {
    lines.push(`## Backend Security & API (${BACKEND_GUARDRAILS.length} checks)`, "");
    for (const g of BACKEND_GUARDRAILS) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
  }

  if (/^rule-data(?:-|$)/.test(skillName)) {
    lines.push(`## Database Safety (${DATABASE_GUARDRAILS.length} checks)`, "");
    for (const g of DATABASE_GUARDRAILS) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
  }

  if (/^rule-devops(?:-|$)/.test(skillName)) {
    lines.push(`## DevOps & Security (${DEVOPS_GUARDRAILS.length} checks)`, "");
    for (const g of DEVOPS_GUARDRAILS) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
  }

  lines.push(
    "## How to use",
    "",
    "1. Generate code following rule AI principles.",
    "2. Run `pix_<skill> check` on the generated code.",
    "3. Fix any FAIL results.",
    "4. Re-check until all pass (allPass: true).",
    "",
  );

  return lines.join("\n");
}
