/**
 * @module core/detector
 *
 * Project framework auto-detector.
 * Reads package.json and detects:
 * - Framework: react, vue, svelte, angular, solid, astro, electron, vanilla
 * - TypeScript vs JavaScript
 * - Build tool: vite, webpack, esbuild, tsc, etc.
 *
 * @see module:tools/router — pix_detect tool registered here
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Framework detection rules: dependency name → framework key.
 * Ordered by specificity (most specific first).
 */
const FRAMEWORK_RULES = [
  { deps: ["@rule/rule-mcp-core"], key: "agents" },
  { deps: ["@angular/core"], key: "angular" },
  { deps: ["react", "react-dom"], key: "react" },
  { deps: ["vue"], key: "vue" },
  { deps: ["svelte"], key: "svelte" },
  { deps: ["solid-js"], key: "solid" },
  { deps: ["astro"], key: "astro" },
  { deps: ["electron"], key: "electron" },
];

/**
 * Build tool detection rules: devDependency name → tool key.
 */
const BUILD_TOOL_RULES = [
  { deps: ["vite"], key: "vite" },
  { deps: ["webpack", "webpack-cli"], key: "webpack" },
  { deps: ["esbuild"], key: "esbuild" },
  { deps: ["@angular/cli"], key: "angular-cli" },
  { deps: ["@sveltejs/kit", "svelte-kit"], key: "sveltekit" },
  { deps: ["next"], key: "next" },
  { deps: ["nuxt"], key: "nuxt" },
  { deps: ["parcel"], key: "parcel" },
  { deps: ["tsup"], key: "tsup" },
  { deps: ["tsc"], key: "tsc" },
];

/**
 * Framework key → canonical thematic skill mapping.
 * Tool names are derived from the skill name by the same rule used by
 * registerSkillTool(): strip `rule-`, replace `-` with `_`, prefix `pix_`.
 */
const FRAMEWORK_SKILL_MAP = {
  agents: "rule-ai-agents",
  angular: "rule-frontend-angular",
  astro: "rule-frontend-astro",
  electron: "rule-platform-desktop",
  react: "rule-frontend-react",
  solid: "rule-frontend-solidjs",
  svelte: "rule-frontend-svelte",
  vanilla: "rule-frontend-vanilla-reactive",
  vue: "rule-frontend-vue",
};

/**
 * Get the canonical skill/tool suggestion for a detected framework key.
 *
 * @param {string} framework — Framework key returned by detectProject
 * @returns {{ skillName: string, toolName: string }}
 */
export function getFrameworkSuggestion(framework) {
  const skillName = FRAMEWORK_SKILL_MAP[framework] || "rule-frontend-vanilla-reactive";
  const displayName = skillName.replace(/^rule-/, "").replace(/-/g, "_");
  return { skillName, toolName: `pix_${displayName}` };
}

/**
 * Detect a dependency in a list of package.json dependencies.
 *
 * @param {object} deps — package.json dependencies or devDependencies
 * @param {string[]} depNames — List of dependency names to check
 * @returns {boolean}
 */
function hasDeps(deps, depNames) {
  if (!deps) return false;
  // Rule matches if ANY of the listed deps are found
  return depNames.some(name => name in deps);
}

/**
 * Detect the project framework, TypeScript usage, and build tool
 * from a project directory's package.json.
 *
 * @param {string} projectDir — Path to project root
 * @returns {{
 *   projectName: string,
 *   framework: string,
 *   typescript: boolean,
 *   buildTool: string,
 *   nodeVersion: string|null
 * }}
 */
export function detectProject(projectDir = ".") {
  const pkgPath = join(projectDir, "package.json");

  if (!existsSync(pkgPath)) {
    return {
      projectName: "unknown",
      framework: "vanilla",
      typescript: false,
      buildTool: "unknown",
      nodeVersion: null,
    };
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Detect framework
    let framework = "vanilla";
    for (const rule of FRAMEWORK_RULES) {
      if (hasDeps(deps, rule.deps)) {
        framework = rule.key;
        break;
      }
    }

    // Detect TypeScript
    const typescript = !!deps?.typescript ||
      existsSync(join(projectDir, "tsconfig.json"));

    // Detect build tool
    let buildTool = "unknown";
    for (const rule of BUILD_TOOL_RULES) {
      if (hasDeps(deps, rule.deps)) {
        buildTool = rule.key;
        break;
      }
    }

    return {
      projectName: pkg.name || "unknown",
      framework,
      typescript,
      buildTool,
      nodeVersion: pkg.engines?.node ?? null,
      tokensave: hasTokensave(projectDir),
    };
  } catch {
    return {
      projectName: "unknown",
      framework: "vanilla",
      typescript: false,
      buildTool: "unknown",
      nodeVersion: null,
      tokensave: hasTokensave(projectDir),
    };
  }
}

/**
 * Detect whether a project has a tokensave code graph (`.tokensave/`).
 * When present, rule tools defer code exploration to tokensave and suppress
 * their own redundant context dumps to save tokens.
 *
 * @param {string} projectDir — Path to project root
 * @returns {boolean}
 */
export function hasTokensave(projectDir = ".") {
  try {
    return existsSync(join(projectDir, ".tokensave"));
  } catch {
    return false;
  }
}
