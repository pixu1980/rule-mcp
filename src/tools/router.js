/**
 * @module tools/router
 *
 * Central tool registry for the rule-mcp server.
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
import { getSkillsDirs as getSkillsDirectories } from "../cli/paths.js";
import { parseSkillFrontmatter } from "../core/skill-frontmatter.js";
import {
  decorateWorkflowReminder,
  enforcementError,
  postprocessToolResult,
  preprocessToolCall,
} from "../core/enforcement.js";
import { cacheGet, cacheKey, cacheSet } from "../core/tool-cache.js";
import { compressResult } from "../core/caveman.js";
import { consumeUpdateBanner, maybeSelfUpdate } from "../core/self-update.js";

/** Prepend a self-update banner (if any) to a result so the update is visible. */
function withBanner(banner, result) {
  if (!banner || !result || !Array.isArray(result.content)) {
    return result;
  }
  return { ...result, content: [{ type: "text", text: banner }, ...result.content] };
}

/**
 * Apply env/state-dependent decoration to a deterministic result core:
 * the workflow reminder (process state + opt-out) then caveman compression
 * (opt-out). Runs on BOTH cache hits and fresh computes so those toggles always
 * take effect and are never frozen into the cache.
 */
function finalizeResult(name, core) {
  return compressResult(decorateWorkflowReminder(name, core));
}

/** Internal list of registered tool definitions. */
const _tools = [];

/** Mandatory before-tool hooks. Failures block execution. */
const _beforeHooks = {};

/** Mandatory post-tool hooks. Failures block result delivery. */
const _postHooks = {};

/** Observational after-tool hooks. Failures never alter tool results. */
const _afterHooks = {};

/** Register mandatory preprocessing hook. */
export function addBeforeToolHook(toolName, function_) {
  if (!_beforeHooks[toolName]) {
    _beforeHooks[toolName] = [];
  }
  _beforeHooks[toolName].push(function_);
}

/** Register mandatory postprocessing hook. */
export function addPostToolHook(toolName, function_) {
  if (!_postHooks[toolName]) {
    _postHooks[toolName] = [];
  }
  _postHooks[toolName].push(function_);
}

/**
 * Register a hook that fires after a tool completes successfully.
 * Wildcard "*" hooks fire for every tool.
 *
 * @param {string} toolName - Tool name or "*" for all tools
 * @param {(toolName: string, args: object, result: object) => Promise<void>} fn
 */
export function addAfterToolHook(toolName, fn) {
  if (!_afterHooks[toolName]) {
    _afterHooks[toolName] = [];
  }
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
 * Retain only tools whose name is in `allowed`; drop the rest. Used by the
 * minimal tool-surface mode to guarantee a small, fixed registry regardless of
 * how many tools were registered upstream.
 *
 * @param {Set<string>|Iterable<string>} allowed
 */
export function retainTools(allowed) {
  const keep = allowed instanceof Set ? allowed : new Set(allowed);
  for (let index = _tools.length - 1; index >= 0; index--) {
    if (!keep.has(_tools[index].name)) {
      _tools.splice(index, 1);
    }
  }
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
 * The raw registered tool definitions (including zodSchema and annotations),
 * for audits that need more than the advertised surface.
 *
 * @returns {Array<object>}
 */
export function declaredTools() {
  return _tools;
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
            .map(([k]) => k),
        );
        const required = (jsonSchema.required ?? []).filter((k) => !hasDefault.has(k));
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
 * @param {string} name - Tool name (e.g. "pix_tool", "rule_tool_frontend_react")
 * @param {object} args - Tool-specific arguments
 * @returns {Promise<{ isError?: boolean, content: Array<{ type: string, text: string }> }>}
 */
export async function callTool(name, args) {
  // ── Self-update: throttled fire-and-forget check on every invocation, kicked
  // BEFORE the cache lookup (so a cache hit can't skip it) and BEFORE tool
  // lookup (a skills reload re-registers _tools). NOT awaited: the tool
  // responds immediately; the banner of a completed background check is
  // consumed below and prepended to this result. pix_update runs its own
  // update. ──
  if (name !== "pix_update") {
    try {
      maybeSelfUpdate();
    } catch {
      /* fail-open */
    }
  }
  const banner = consumeUpdateBanner();

  const tool = _tools.find((t) => t.name === name);
  if (!tool) {
    return withBanner(banner, { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] });
  }

  let stage = "validation";
  try {
    const validated = tool.zodSchema ? tool.zodSchema.parse(args) : args;

    // ── Deterministic recycle: replay a cached result for read-only tools ──
    // The server never calls a model, so an identical (tool, args) call always
    // produces the same output. Serve it from cache instead of recomputing.
    stage = "cache";
    const key = cacheKey(name, validated);
    if (key) {
      const cached = cacheGet(key);
      if (cached) {
        return withBanner(banner, finalizeResult(name, cached));
      }
    }

    stage = "preprocessing";
    let processedArguments = preprocessToolCall(name, validated);
    const beforeHooks = [...(_beforeHooks["*"] || []), ...(_beforeHooks[name] || [])];
    for (const function_ of beforeHooks) {
      processedArguments = (await function_(name, processedArguments, tool)) ?? processedArguments;
    }

    stage = "execution";
    let result = await tool.handler(processedArguments);

    stage = "postprocessing";
    const postHooks = [...(_postHooks["*"] || []), ...(_postHooks[name] || [])];
    for (const function_ of postHooks) {
      result = (await function_(name, processedArguments, result, tool)) ?? result;
    }
    // Deterministic core - validated + metadata, no env/state-dependent decoration.
    const core = postprocessToolResult(name, processedArguments, result, {
      toolNames: _tools.map((item) => item.name),
      skillNames: getSkillNames(),
    });

    stage = "finalize";
    if (!core?.isError) {
      // Cache the deterministic core (reminder + caveman are re-applied per call).
      if (key) {
        cacheSet(key, core);
      }
      const final = finalizeResult(name, core);
      const hooks = [...(_afterHooks["*"] || []), ...(_afterHooks[name] || [])];
      for (const function_ of hooks) {
        function_(name, processedArguments, final).catch(() => {});
      }
      return withBanner(banner, final);
    }

    return withBanner(banner, finalizeResult(name, core));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((index) => `- ${index.path.join(".")}: ${index.message}`).join("\n");
      return withBanner(banner, { isError: true, content: [{ type: "text", text: `Invalid arguments:\n${issues}` }] });
    }
    return withBanner(banner, enforcementError(name, stage, error));
  }
}

/**
 * Read the SKILL.md file for a given skill name.
 *
 * The bundled `skills/` directory is the ONLY source. `~/.agents/skills` used to
 * take precedence, which let a directory in the user's home silently replace the
 * content this server ships under the same tool name.
 *
 * @param {string} skillName - e.g. "rule-frontend-react", "rule-styleguide"
 * @returns {string|null} - The full SKILL.md content, or null if not found
 */
export function readSkill(skillName) {
  const { embeddedSkills } = getSkillsDirectories();
  try {
    return readFileSync(join(embeddedSkills, skillName, "SKILL.md"), "utf8");
  } catch {
    return null;
  }
}

/**
 * Get a sorted list of all available skill names.
 *
 * The tool surface of this server is defined by the bundled `skills/` directory
 * and by nothing else. Two rules, both deliberate:
 *
 *   - only `skills/` is scanned. Merging `~/.agents/skills` meant any directory
 *     there became a callable tool under the pix_ prefix: 79 stale `rule-*`
 *     directories from the previous brand resurfaced as `pix_pix_*`, and
 *     generic skills like `test-driven-development` were renamed into the
 *     namespace. It also made plugin.js in the user's home an in-process import.
 *   - only `rule-*` names are accepted, so a foreign directory dropped into
 *     `skills/` cannot mint a tool that claims to be ours either.
 *
 * The bare `rule` directory is excluded: it backs the dispatcher tool, which
 * is registered by code, not as a per-skill tool.
 *
 * @returns {string[]}
 */

const skillCache = new Map();

export function getSkillMetadata(skillName) {
  const cacheKey = `meta:${skillName}`;
  const cached = skillCache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  const content = readSkill(skillName);
  if (!content) {
    return {};
  }
  const meta = parseSkillFrontmatter(content);
  skillCache.set(cacheKey, JSON.stringify(meta));
  return meta;
}

export function getSkillNames() {
  const names = new Set();
  const { embeddedSkills } = getSkillsDirectories();
  try {
    for (const entry of readdirSync(embeddedSkills, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("rule-")) {
        continue;
      }
      if (!existsSync(join(embeddedSkills, entry.name, "SKILL.md"))) {
        continue;
      }
      names.add(entry.name);
    }
  } catch {
    /* no dir */
  }
  return [...names].sort();
}

/**
 * Check if a skill name is foreign to this server.
 *
 * getSkillNames() only ever yields `rule-*` names, so this is false for every
 * registered skill. It is kept as an explicit guard: resources and skill tools
 * consult it before treating a name as ours.
 *
 * @param {string} skillName
 * @returns {boolean}
 */
export function isPluginSkill(skillName) {
  // rule is the router skill, not a plugin
  if (skillName === "rule") {
    return false;
  }
  return !skillName.startsWith("rule-");
}

/**
 * Whether a skill ships a plugin.js.
 *
 * Always false: plugin.js was only ever imported from `~/.agents/skills`, which
 * this server no longer reads. Importing it meant executing code from the user's
 * home directory in-process at startup, with no isolation and failures swallowed
 * (2026-08-04 audit, finding 15). Bundled skills carry no plugin.js.
 *
 * @param {string} _pluginName - The plugin directory name
 * @returns {boolean}
 */
export function hasPluginJs(_pluginName) {
  return false;
}
