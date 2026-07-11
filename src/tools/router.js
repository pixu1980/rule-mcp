/**
 * @module tools/router
 *
 * Central tool registry for the pix-galaxy-mcp server.
 * Provides low-level tool registration, listing, execution, and skill file access.
 *
 * Higher-level registration functions (registerAiTool, registerSkillTool, etc.)
 * live in `core/skills.js` which imports from this module.
 *
 * @see module:core/skills
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod/v4";
import { getSkillsDirs } from "../cli/paths.js";
import { enforcementError, postprocessToolResult, preprocessToolCall } from "../core/enforcement.js";

/** Internal list of registered tool definitions. */
const _tools = [];

/** Mandatory before-tool hooks. Failures block execution. */
const _beforeHooks = {};

/** Mandatory post-tool hooks. Failures block result delivery. */
const _postHooks = {};

/** Observational after-tool hooks. Failures never alter tool results. */
const _afterHooks = {};

/** Register mandatory preprocessing hook. */
export function addBeforeToolHook(toolName, fn) {
  if (!_beforeHooks[toolName]) _beforeHooks[toolName] = [];
  _beforeHooks[toolName].push(fn);
}

/** Register mandatory postprocessing hook. */
export function addPostToolHook(toolName, fn) {
  if (!_postHooks[toolName]) _postHooks[toolName] = [];
  _postHooks[toolName].push(fn);
}

/**
 * Register a hook that fires after a tool completes successfully.
 * Wildcard "*" hooks fire for every tool.
 *
 * @param {string} toolName — Tool name or "*" for all tools
 * @param {(toolName: string, args: object, result: object) => Promise<void>} fn
 */
export function addAfterToolHook(toolName, fn) {
  if (!_afterHooks[toolName]) _afterHooks[toolName] = [];
  _afterHooks[toolName].push(fn);
}

/**
 * Clear all registered tools. Used during force-reload to
 * allow re-registration without duplicate entries.
 */
export function clearTools() {
  _tools.length = 0;
}

/**
 * Register a tool definition.
 *
 * @param {{
 *   name: string,
 *   description: string,
 *   inputSchema?: object,
 *   zodSchema?: import("zod/v4").ZodObject<any>,
 *   handler: (args: object) => Promise<{ isError?: boolean, content: Array<{ type: string, text: string }> }>
 * }} tool
 */
export function registerTool(tool) {
  _tools.push(tool);
}

/**
 * List all registered tools with their names, descriptions, and input schemas.
 * Converts Zod schemas to JSON Schema via the built-in toJSONSchema() method.
 *
 * @returns {Array<{ name: string, description: string, inputSchema: object }>}
 */
export function listTools() {
  return _tools.map((t) => {
    let inputSchema = t.inputSchema ?? { type: "object", properties: {} };

    // If a Zod schema is provided, convert it to JSON Schema
    if (t.zodSchema) {
      try {
        const jsonSchema = t.zodSchema.toJSONSchema();
        // Properties with .default() should not be in required
        // because the server fills them in automatically
        const hasDefault = new Set(
          Object.entries(jsonSchema.properties ?? {})
            .filter(([, v]) => v && typeof v === "object" && "default" in v)
            .map(([k]) => k)
        );
        const required = (jsonSchema.required ?? []).filter(k => !hasDefault.has(k));
        inputSchema = {
          type: jsonSchema.type ?? "object",
          properties: jsonSchema.properties ?? {},
          required,
        };
      } catch {
        // Fall back to plain inputSchema if conversion fails
      }
    }

    return { name: t.name, description: t.description, inputSchema };
  });
}

/**
 * Execute a tool by name with the given arguments.
 * Validates args against the tool's Zod schema (if provided) before calling the handler.
 *
 * @param {string} name — Tool name (e.g. "pix", "pix_react")
 * @param {object} args — Tool-specific arguments
 * @returns {Promise<{ isError?: boolean, content: Array<{ type: string, text: string }> }>}
 */
export async function callTool(name, args) {
  const tool = _tools.find((t) => t.name === name);
  if (!tool) {
    return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }

  let stage = "validation";
  try {
    const validated = tool.zodSchema ? tool.zodSchema.parse(args) : args;

    stage = "preprocessing";
    let processedArgs = preprocessToolCall(name, validated);
    const beforeHooks = [...(_beforeHooks["*"] || []), ...(_beforeHooks[name] || [])];
    for (const fn of beforeHooks) {
      processedArgs = await fn(name, processedArgs, tool) ?? processedArgs;
    }

    stage = "execution";
    let result = await tool.handler(processedArgs);

    stage = "postprocessing";
    const postHooks = [...(_postHooks["*"] || []), ...(_postHooks[name] || [])];
    for (const fn of postHooks) {
      result = await fn(name, processedArgs, result, tool) ?? result;
    }
    result = postprocessToolResult(name, processedArgs, result, {
      toolNames: _tools.map((item) => item.name),
      skillNames: getSkillNames(),
    });

    if (!result?.isError) {
      const hooks = [...(_afterHooks["*"] || []), ...(_afterHooks[name] || [])];
      for (const fn of hooks) fn(name, processedArgs, result).catch(() => {});
    }

    return result;
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map(i => `- ${i.path.join(".")}: ${i.message}`).join("\n");
      return { isError: true, content: [{ type: "text", text: `Invalid arguments:\n${issues}` }] };
    }
    return enforcementError(name, stage, err);
  }
}

/**
 * Read the SKILL.md file for a given skill name.
 * Searches homeSkills (~/.agents/skills) first, then embeddedSkills (bundled).
 *
 * @param {string} skillName — e.g. "pix-frontend-react", "pix-styleguide"
 * @returns {string|null} — The full SKILL.md content, or null if not found
 */
export function readSkill(skillName) {
  const { homeSkills, embeddedSkills } = getSkillsDirs();
  for (const base of [homeSkills, embeddedSkills]) {
    try {
      return readFileSync(join(base, skillName, "SKILL.md"), "utf8");
    } catch { /* next */ }
  }
  return null;
}

/**
 * Get a sorted list of all available skill names.
 * Merges embedded and home directories, deduplicates.
 *
 * Plugin detection: any directory with a SKILL.md file is auto-detected,
 * regardless of naming convention. Official pix skills start with "pix-".
 *
 * @returns {string[]}
 */
export function getSkillNames() {
  const names = new Set();
  const { homeSkills, embeddedSkills } = getSkillsDirs();
  for (const base of [embeddedSkills, homeSkills]) {
    try {
      for (const entry of readdirSync(base, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === "pix") continue;
        // Official pix skills: pix-frontend-react, pix-backend-express, etc.
        // Also include bare pix dispatcher skill.
        if (entry.name.startsWith("pix-") || entry.name === "pix") { names.add(entry.name); continue; }
        // Plugin detection: any directory with a SKILL.md is a plugin
        try {
          if (existsSync(join(base, entry.name, "SKILL.md"))) {
            names.add(entry.name);
          }
        } catch { /* skip */ }
      }
    } catch { /* no dir */ }
  }
  return [...names].sort();
}

/**
 * Check if a skill is a plugin (non-official, user-defined).
 * Plugins live in ~/.agents/skills/ and do not start with "pix-".
 *
 * @param {string} skillName
 * @returns {boolean}
 */
export function isPluginSkill(skillName) {
  // pix is the router skill, not a plugin
  if (skillName === "pix") return false;
  return !skillName.startsWith("pix-");
}

/**
 * Check if a plugin skill has a custom plugin.js for extended functionality.
 *
 * @param {string} pluginName — The plugin directory name
 * @returns {boolean}
 */
export function hasPluginJs(pluginName) {
  const { homeSkills } = getSkillsDirs();
  try {
    return existsSync(join(homeSkills, pluginName, "plugin.js"));
  } catch { return false; }
}

/**
 * Dynamic import a plugin's plugin.js file.
 * Returns the plugin's exported guardrails and generators, or null.
 *
 * @param {string} pluginName — The plugin directory name
 * @returns {Promise<{ guardrails?: Array, generators?: object } | null>}
 */
export async function loadPluginJs(pluginName) {
  const { homeSkills } = getSkillsDirs();
  try {
    const pluginPath = new URL("file://" + join(homeSkills, pluginName, "plugin.js"));
    const mod = await import(pluginPath.href);
    return { guardrails: mod.guardrails || null, generators: mod.generators || null };
  } catch { return null; }
}
