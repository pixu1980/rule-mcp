/**
 * @module core/detector
 *
 * Project framework auto-detector.
 * Reads package.json and detects:
 * - Framework: react, vue, svelte, angular, solid, astro, electron, vanilla
 * - TypeScript vs JavaScript
 * - Build tool: vite, webpack, esbuild, tsc, etc.
 *
 * @see module:tools/router - pix_detect tool registered here
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BUILD_TOOL_RULES, FRAMEWORK_RULES, FRAMEWORK_SKILL_MAP } from "./_rules.data.js";

/**
 * Get the canonical skill/tool suggestion for a detected framework key.
 *
 * @param {string} framework - Framework key returned by detectProject
 * @returns {{ skillName: string, toolName: string }}
 */
export function getFrameworkSuggestion(framework) {
  const skillName = FRAMEWORK_SKILL_MAP[framework] || "rule-frontend-vanilla-reactive";
  const displayName = skillName.replace(/^rule-/, "").replaceAll("-", "_");

  return { skillName, toolName: `rule_tool_${displayName}` };
}

/**
 * Detect a dependency in a list of package.json dependencies.
 *
 * @param {object} deps - package.json dependencies or devDependencies
 * @param {string[]} depNames - List of dependency names to check
 * @returns {boolean}
 */
function hasDependencies(deps, depNames) {
  if (!deps) {
    return false;
  }
  // Rule matches if ANY of the listed deps are found
  return depNames.some((name) => name in deps);
}

/**
 * Detect the project framework, TypeScript usage, and build tool
 * from a project directory's package.json.
 *
 * @param {string} projectDir - Path to project root
 * @returns {{
 *   projectName: string,
 *   framework: string,
 *   typescript: boolean,
 *   buildTool: string,
 *   nodeVersion: string|null
 * }}
 */
export function detectProject(projectDir = ".") {
  const packagePath = join(projectDir, "package.json");

  if (!existsSync(packagePath)) {
    return {
      projectName: "unknown",
      framework: "vanilla",
      typescript: false,
      buildTool: "unknown",
      nodeVersion: null,
    };
  }

  try {
    const package_ = JSON.parse(readFileSync(packagePath, "utf8"));
    const dependencies = { ...package_.dependencies, ...package_.devDependencies };

    // Detect framework
    let framework = "vanilla";

    for (const rule of FRAMEWORK_RULES) {
      if (hasDependencies(dependencies, rule.deps)) {
        framework = rule.key;
        break;
      }
    }

    // Detect TypeScript
    const typescript = !!dependencies?.typescript || existsSync(join(projectDir, "tsconfig.json"));

    // Detect build tool
    let buildTool = "unknown";

    for (const rule of BUILD_TOOL_RULES) {
      if (hasDependencies(dependencies, rule.deps)) {
        buildTool = rule.key;
        break;
      }
    }

    return {
      projectName: package_.name || "unknown",
      framework,
      typescript,
      buildTool,
      nodeVersion: package_.engines?.node ?? null,
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
 * @param {string} projectDir - Path to project root
 * @returns {boolean}
 */
export function hasTokensave(projectDir = ".") {
  try {
    return existsSync(join(projectDir, ".tokensave"));
  } catch {
    return false;
  }
}
