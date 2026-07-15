/**
 * @module core/skills
 *
 * Skill loading and registration orchestration.
 * Handles loading all pix skills from disk, registering them as MCP tools,
 * and providing skill content utility functions.
 *
 * This is the LEAN core module — tool-specific registration logic
 * lives in tools/skill.js and tools/architect.js.
 *
 * Called once at startup, or on demand via `skills reload` CLI command.
 */
import { z } from "zod/v4";
import { readSkill, getSkillNames, registerTool, isPluginSkill, hasPluginJs, loadPluginJs, clearTools } from "../tools/router.js";
import { registerSkillTool, registerSearchTool, registerCheckTool, registerScaffoldTool } from "../tools/skill.js";
import { registerAiTool } from "../tools/ai.js";
import { registerProcessAdrTool } from "../tools/adr.js";
import { registerFixTool } from "../tools/fix.js";
import { registerProcessHandoffTool } from "../tools/handoff.js";
import { registerGatewayTool } from "../tools/gateway.js";
import { registerApplyTool } from "../tools/apply.js";
import { detectProject, getFrameworkSuggestion } from "./detector.js";

/**
 * Strict mode: when PIX_STRICT_MODE=1, only expose gateway + apply + read-only tools.
 * Skill-specific tools and mutation tools are hidden.
 */
const STRICT_MODE = process.env.PIX_STRICT_MODE === "1";

/**
 * Tools that write to disk or have side effects.
 * Hidden in strict mode — all writes go through pix_apply.
 */
const MUTATION_TOOLS = new Set([
  "pix_fix",
  "pix_process_adr",
]);

/**
 * Skill-specific tools (pix_backend_express, pix_data_postgresql, etc.).
 * Hidden in strict mode — evidence is loaded via pix_gateway.
 */
const SKILL_TOOL_PREFIX = "pix_";

/**
 * Core tools always available in strict mode.
 */
const STRICT_CORE_TOOLS = new Set([
  "pix_gateway",
  "pix_apply",
  "pix_search",
  "pix_check",
  "pix_detect",
  "pix_scaffold",
  "pix_component",
  "pix_process_handoff",
]);
/** Whether skills have been loaded yet. */
let loaded = false;
/** Simple in-memory LRU cache for skill content (read-through). */
class LruCache {
  /**
   * @param {number} maxSize — Max entries before eviction (default 50)
   */
  constructor(maxSize = 50) {
    /** @type {Map<string, string>} */
    this._map = new Map();
    this._maxSize = maxSize;
  }
  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) { return this._map.has(key); }
  /**
   * Get a value, promoting it to MRU position.
   * @param {string} key
   * @returns {string|undefined}
   */
  get(key) {
    if (!this._map.has(key)) return undefined;
    const value = this._map.get(key);
    this._map.delete(key);
    this._map.set(key, value);
    return value;
  }
  /**
   * Set a value, evicting LRU if over maxSize.
   * @param {string} key
   * @param {string} value
   */
  set(key, value) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, value);
    if (this._map.size > this._maxSize) {
      const firstKey = this._map.keys().next().value;
      if (firstKey !== undefined) this._map.delete(firstKey);
    }
  }
  /** Clear all entries. */
  clear() { this._map.clear(); }
  /** @returns {number} */
  get size() { return this._map.size; }
}
/**
 * Global LRU cache for skill content.
 * Allows caching frequently accessed SKILL.md content
 * and parsed metadata across requests.
 */
export const skillCache = new LruCache(50);
/**
 * Load all pix skills and register their corresponding MCP tools.
 * Idempotent — subsequent calls are no-ops unless `force` is true.
 *
 * @param {boolean} [force=false] — Force re-load even if already loaded
 */
export async function loadAllSkills(force = false) {
  if (loaded && !force) return;
  if (force) {
    skillCache.clear();
    clearTools();
  }
  loaded = true;
  registerAiTool();
  await registerGatewayTool();
  await registerApplyTool();

  const skillNames = getSkillNames();
  const pluginLoaders = [];
  for (const name of skillNames) {
    if (name !== "pix" && name !== "pix-process-adr" && name !== "pix-process-handoff") {
      // In strict mode, skip skill-specific tools — evidence is loaded via pix_gateway
      if (!STRICT_MODE) {
        registerSkillTool(name);
      }
    }
    // Load plugin.js for custom plugins (async, non-blocking)
    if (isPluginSkill(name) && hasPluginJs(name)) {
        pluginLoaders.push(
          loadPluginJs(name).then(plugin => {
            return import("./guardrails.js").then(mod => {
              if (mod.mergePluginGuardrails && plugin?.guardrails) {
                mod.mergePluginGuardrails(name, plugin.guardrails);
              }
            });
          }).catch(() => {})
        );
      }
  }
  await Promise.all(pluginLoaders);
  registerSearchTool();
  registerCheckTool();
  registerScaffoldTool();
  registerDetectTool();
  // Mutation tools: hidden in strict mode
  if (!STRICT_MODE) {
    registerProcessAdrTool();
    registerFixTool();
  }
  registerProcessHandoffTool();  // Build BM25 search index (async, non-blocking)
  const { buildIndex, clearIndex } = await import("./bm25.js");
  if (force) clearIndex();
  buildIndex();
  const { registerTemplateTool } = await import("./templates.js");
  registerTemplateTool();
}
/**
 * Parse YAML frontmatter from a skill SKILL.md file.
 * Extracts name, description, tags, and frameworks metadata
 * from the YAML frontmatter block (between --- markers).
 *
 * Supports:
 * - Inline scalars: `description: text`
 * - Literal block scalars: `description: |\n  line1\n  line2`
 * - Folded block scalars: `description: >\n  line1\n  line2`
 *
 * @param {string} content — Full SKILL.md content
 * @returns {{ name?: string, description?: string, tags?: string[], frameworks?: string[] }}
 */
export function parseSkillFrontmatter(content) {
  const result = {};
  const match = content?.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return result;
  const frontmatter = match[1];
  const lines = frontmatter.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // name: inline scalar
    const nameMatch = line.match(/^name:\s*(.+)$/);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
      continue;
    }
    // description: could be inline or block scalar
    const descInline = line.match(/^description:\s*(.+)$/);
    if (descInline) {
      const afterColon = descInline[1];
      if (afterColon.startsWith("|") || afterColon.startsWith(">")) {
        // Literal or folded block scalar — collect indented continuation lines
        const isFolded = afterColon.startsWith(">");
        const parts = [];
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          // Block ends when a line is NOT indented (starts at col 0 or is empty)
          if (nextLine.length === 0 || !nextLine.startsWith(" ") && !nextLine.startsWith("\t")) break;
          const stripped = nextLine.trim();
          if (stripped.length > 0 || !isFolded) {
            parts.push(stripped);
          }
        }
        result.description = isFolded
          ? parts.join(" ").replace(/\s+/g, " ")
          : parts.join("\n");
        if (result.description) result.description = result.description.trim();
      } else {
        // Inline scalar
        result.description = afterColon.trim();
      }
      continue;
    }
    // tags: YAML list (block)
    if (trimmed === "tags:") {
      const tags = [];
      for (let j = i + 1; j < lines.length; j++) {
        const tagLine = lines[j].trim();
        if (tagLine.startsWith("- ")) {
          tags.push(tagLine.slice(2).trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
        } else if (!tagLine.startsWith("-")) {
          break;
        }
      }
      if (tags.length > 0) result.tags = tags;
      continue;
    }
    // frameworks: inline scalar
    const fwMatch = line.match(/^frameworks:\s*(.+)$/);
    if (fwMatch) {
      result.frameworks = fwMatch[1].split(",").map(s => s.trim().replace(/^\[|\]$/g, ""));
      continue;
    }
  }
  return result;
}
/**
 * Get skill metadata (parsed from YAML frontmatter).
 * Results are cached in the LRU cache.
 *
 * @param {string} skillName — e.g. "pix-frontend-react"
 * @returns {{ name?: string, description?: string, tags?: string[], frameworks?: string[] }}
 */
export function getSkillMetadata(skillName) {
  const cacheKey = `meta:${skillName}`;
  const cached = skillCache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const content = readSkill(skillName);
  if (!content) return {};
  const meta = parseSkillFrontmatter(content);
  skillCache.set(cacheKey, JSON.stringify(meta));
  return meta;
}
/**
 * Extract the "Project Scaffolding" section from a SKILL.md file.
 * Looks for the section between the scaffold heading and the next section.
 *
 * @param {string} content — Full SKILL.md content
 * @returns {string} — The extracted scaffolding section text
 */
export function extractScaffoldSection(content) {
  const startMarker = "## Project Scaffolding";
  const endMarker = "## Guardrails";
  const start = content.indexOf(startMarker);
  if (start < 0) return "Scaffolding section not found. Use pix_styleguide mode=full to read the full skill.";
  const end = content.indexOf(endMarker, start + 1);
  return content.slice(start, end > start ? end : undefined).trim();
}
/**
 * Extract a single scaffold file's content from the scaffolding section.
 * Matches by file name in a markdown heading (e.g. ### `.prettierrc`).
 *
 * @param {string} section — The extracted scaffolding section text
 * @param {string} fileName — The config file name (e.g. ".prettierrc")
 * @returns {{ isError?: boolean, content: Array<{ type: string, text: string }> }}
 */
export function extractSingleScaffoldFile(section, fileName) {
  const lines = section.split("\n");
  const headers = [
    "### `" + fileName + "`",
    "### " + fileName,
    "#### `" + fileName + "`",
    "#### " + fileName,
  ];
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headers.some(h => lines[i].trim() === h)) { startIdx = i; break; }
  }
  if (startIdx < 0) {
    return { isError: true, content: [{ type: "text", text: "File \"" + fileName + "\" not found. Available: .prettierrc, .nvmrc, .editorconfig, .gitignore, .eslintrc.json, tsconfig.json, jsconfig.json" }] };
  }
  let fenceStart = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith("```")) { fenceStart = i; break; }
  }
  if (fenceStart < 0) {
    return { isError: true, content: [{ type: "text", text: "No code block found for \"" + fileName + "\"." }] };
  }
  const contentLines = [];
  for (let i = fenceStart + 1; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith("```")) break;
    contentLines.push(lines[i]);
  }
  return { content: [{ type: "text", text: contentLines.join("\n") }] };
}
/**
 * Register the pix_detect tool for project framework detection.
 */
function registerDetectTool() {
  const DetectSchema = z.object({
    path: z.string().optional().default(".").describe("Project directory path"),
  });
  registerTool({
    name: "pix_detect",
    description: "Detect project framework, TypeScript usage, and build tool from package.json.",
    zodSchema: DetectSchema,
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", default: ".", description: "Project root path" },
      },
    },
    handler: async (args) => {
      const projectDir = args.path || ".";
      const profile = detectProject(projectDir);
      // Suggest relevant skill tools based on detected framework
      const { skillName, toolName } = getFrameworkSuggestion(profile.framework);
      const suggestions = [
        toolName,
        "pix_check",
        "pix_scaffold",
        "pix_component",
      ];
      const result = {
        ...profile,
        suggested_skills: [skillName],
        suggested_tools: suggestions,
        message: `Detected ${profile.framework === "vanilla" ? "vanilla JS" : profile.framework} project "${profile.projectName}". ` +
          `Use ${suggestions.join(", ")} for pix-compliant code generation.`,
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}
