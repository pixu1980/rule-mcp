/**
 * rule-mcp Guardrails Engine
 *
 * Public API for guardrails: getGuardrails, checkCode, getGuardrailsReport.
 * Guardrail definitions live in the sibling catalog modules (imported below,
 * per module rather than through the barrel: the barrel re-exports this
 * engine, so importing it back would be a cycle).
 *
 * The agent iterates: generate → check → fix → re-check → until all pass.
 */

import { SHARED_GUARDRAILS } from "./shared/index.js";
import { SCAFFOLD_GUARDRAILS } from "./_scaffold.js";
import { BACKEND_GUARDRAILS } from "./_backend.js";
import { DATABASE_GUARDRAILS } from "./_database.js";
import { DEVOPS_GUARDRAILS } from "./_devops.js";
import { FRAMEWORK_GUARDRAILS } from "./framework/index.js";
import { A11Y_GUARDRAILS, QUALITY_GUARDRAILS } from "./quality/index.js";

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

// ─── Public API ───

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

  // DevOps guardrails for devops skills
  const isDevops = /^rule-devops(?:-|$)/.test(skillName);
  const devops = isDevops ? DEVOPS_GUARDRAILS : [];

  // Accessibility guardrails: the a11y skill always, and any skill checking
  // markup or styles - a React component is as much an a11y surface as a page.
  const isA11y = skillName === "rule-styleguide-a11y" || /^rule-(?:frontend|platform|ui|styleguide)/.test(skillName);
  const a11y = isA11y ? A11Y_GUARDRAILS : [];

  const families = [
    ...QUALITY_GUARDRAILS,
    ...SHARED_GUARDRAILS,
    ...frameworkSpecific,
    ...scaffold,
    ...backend,
    ...database,
    ...devops,
    ...a11y,
    ...plugin,
  ];

  // One run per rule id: the simplicity rules belong to the quality family AND
  // to the shared set (the simplicity test pins that), so the assembly dedupes
  // instead of running the same rule twice for every skill.
  const seen = new Set();

  return families.filter((guardrail) => !seen.has(guardrail.id) && seen.add(guardrail.id));
}

/**
 * Hard cap on the input handed to guardrail regexes. Above it the check is
 * refused outright: pattern time grows super-linearly on adversarial input
 * (67 s measured on ~200 KB) and the regexes run synchronously on the only
 * thread, so a size gate is the one defense that cannot be backtracked around.
 */
export const MAX_CHECK_INPUT_BYTES = 256 * 1024;

/**
 * Run every guardrail for a skill over a body of code.
 *
 * @param {string} skillName
 * @param {string} code
 * @param {object} [context]
 * @returns {object} the check report
 */
export function checkCode(skillName, code, context = {}) {
  // Refuse oversize input fast instead of scanning it (hardening 0.1).
  if (typeof code === "string" && Buffer.byteLength(code, "utf8") > MAX_CHECK_INPUT_BYTES) {
    return {
      skill: skillName,
      total: 1,
      passCount: 0,
      failCount: 1,
      skippedCount: 0,
      passed: [],
      failed: [
        {
          id: "input-size-cap",
          wcag: "",
          label: "Input exceeds the size cap",
          failCount: 1,
          detail: [`Input is ${Buffer.byteLength(code, "utf8")} bytes; the cap is ${MAX_CHECK_INPUT_BYTES} (256 KiB).`],
          suggestion: "Split the input into smaller units (256 KiB cap), or exclude generated/vendored files.",
        },
      ],
      skipped: [],
      inputTooLarge: true,
      summary: "❌ Refused to check: input exceeds the 256 KiB cap. Split it into smaller units.",
      allPass: false,
      previousPassed: [],
    };
  }

  const guardrails = getGuardrails(skillName, context?.mode);
  const previousPassed = new Set(); // ← always start fresh - no client bypass

  const results = guardrails.map((g) => {
    if (previousPassed.has(g.id)) {
      return {
        id: g.id,
        label: g.label,
        pass: true,
        failCount: 0,
        detail: [],
        suggestion: "",
        note: "Skipped - previously passed",
        skipped: true,
      };
    }

    const result = g.check(code, context);

    return {
      id: g.id,
      label: g.label,
      wcag: g.wcag || "",
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
      wcag: r.wcag || "",
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

/**
 * Render the guardrail ruleset for a skill as text.
 *
 * @param {string} skillName
 * @param {string} [mode]
 * @returns {string}
 */
/**
 * Render the guardrail ruleset for a skill as text.
 *
 * @param {string} skillName
 * @param {string} [mode]
 * @returns {string}
 */
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
