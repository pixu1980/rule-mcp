

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

import { existsSync } from "node:fs";
import { join } from "node:path";
import { projectManifest, readManifest } from "../tokensave/_deps.js";
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
/** The empty profile a project without a package.json answers. */
function emptyProfile(projectDir) {
  return { projectName: "unknown", framework: "vanilla", typescript: false, buildTool: "unknown", nodeVersion: null, tokensave: hasTokensave(projectDir) };
}

/**
 * Detect from an already-read manifest.
 *
 * @param {object} manifest - package.json shape
 * @param {string} projectDir
 * @returns {{ projectName: string, framework: string, typescript: boolean, buildTool: string, nodeVersion: string|null, tokensave: boolean }}
 */
function detectFromManifest(manifest, projectDir) {
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };

  let framework = "vanilla";

  for (const rule of FRAMEWORK_RULES) {
    if (hasDependencies(dependencies, rule.deps)) {
      framework = rule.key;
      break;
    }
  }

  const typescript = !!dependencies?.typescript || existsSync(join(projectDir, "tsconfig.json"));

  let buildTool = "unknown";

  for (const rule of BUILD_TOOL_RULES) {
    if (hasDependencies(dependencies, rule.deps)) {
      buildTool = rule.key;
      break;
    }
  }

  return {
    projectName: manifest.name || "unknown",
    framework,
    typescript,
    buildTool,
    nodeVersion: manifest.engines?.node ?? null,
    tokensave: hasTokensave(projectDir),
  };
}

/**
 * Detect the project framework, TypeScript usage, and build tool from a
 * project directory's package.json.
 *
 * @param {string} projectDir - Path to project root
 * @returns {{ projectName: string, framework: string, typescript: boolean, buildTool: string, nodeVersion: string|null, tokensave: boolean }}
 */
export function detectProject(projectDir = ".") {
  const manifest = readManifest(projectDir);

  return manifest ? detectFromManifest(manifest, projectDir) : emptyProfile(projectDir);
}

/**
 * Detection that prefers the TokenSave manifest provider and falls back to a
 * direct package.json read.
 *
 * @param {string} [projectDir]
 * @param {{ probe?: Function, client?: Function }} [options]
 * @returns {{ projectName: string, framework: string, typescript: boolean, buildTool: string, nodeVersion: string|null, tokensave: boolean }}
 */
export function detectProjectGraph(projectDir = ".", options = {}) {
  const manifest = projectManifest(projectDir, options);

  return manifest ? detectFromManifest(manifest, projectDir) : emptyProfile(projectDir);
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
