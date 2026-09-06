/**
 * @module core/skills/load
 *
 * Skill loading and registration orchestration.
 * Handles loading all rule skills from disk, registering them as MCP tools,
 * and providing skill content utility functions.
 *
 * The tool-specific registration logic lives in tools/skill/.
 *
 * Called once at startup, or on demand via `skills reload` CLI command.
 */

import { getSkillNames, clearTools, retainTools } from "../../tools/router/index.js";
import { registerSkillTool, registerSearchTool, registerCheckTool, registerScaffoldTool } from "../../tools/skill/index.js";
import { registerAiTool } from "../../tools/ai/index.js";
import { registerProcessAdrTool } from "../../tools/adr/index.js";
import { registerFixTool } from "../../tools/fix/index.js";
import { registerProcessHandoffTool } from "../../tools/handoff/index.js";
import { registerGatewayTool } from "../../tools/gateway/index.js";
import { registerApplyTool } from "../../tools/apply/index.js";
import { registerDetectTool } from "./_detect-tool.js";
import { IS_MINIMAL_TOOLS, MINIMAL_ALLOWLIST } from "./_minimal.js";
import { skillCache } from "./_lru.js";

let isLoaded = false;

/**
 * Load all rule skills and register their corresponding MCP tools.
 * Idempotent - subsequent calls are no-ops unless `force` is true.
 *
 * @param {boolean} [force=false] - Force re-load even if already loaded
 */
export async function loadAllSkills(force = false) {
  if (isLoaded && !force) {
    return;
  }

  if (force) {
    skillCache.clear();
    clearTools();
    // Skill content changed - invalidate the deterministic result cache so we
    // never replay outputs computed from stale skills.
    const { cacheClear, clearSkillDigests } = await import("../cache/tool-cache/index.js");
    cacheClear();
    clearSkillDigests();
  }

  isLoaded = true;
  registerAiTool();
  const { registerUpdateTool } = await import("../../tools/update.js");
  registerUpdateTool();
  await registerGatewayTool();
  await registerApplyTool();

  const skillNames = getSkillNames();

  for (const name of skillNames) {
    // In minimal mode, skip skill-specific tools - evidence is loaded via pix_gateway
    if (name !== "rule" && name !== "rule-process-adr" && name !== "rule-process-handoff" && !IS_MINIMAL_TOOLS) {
      registerSkillTool(name);
    }
  }

  registerSearchTool();
  registerCheckTool();
  registerScaffoldTool();
  registerDetectTool();
  const { registerCompressTool } = await import("../../tools/compress.js");
  registerCompressTool();
  // Action tools: the collection-helpers of the rule surface. All read-only
  // except the plan/plan-docs writers, which are operationally useful in every
  // mode.
  const { registerPlanTool } = await import("../../tools/plan.js");
  registerPlanTool();
  const { registerPlanDocsTool } = await import("../../tools/plan-docs.js");
  registerPlanDocsTool();
  const { registerStatsTool } = await import("../../tools/stats.js");
  registerStatsTool();
  const { registerUsageTool } = await import("../../tools/usage.js");
  registerUsageTool();
  const { registerA11yReportTool } = await import("../../tools/a11y/index.js");
  registerA11yReportTool();
  const { registerProcessHandonTool } = await import("../../tools/handon/index.js");
  registerProcessHandonTool();
  // Mutation tools: hidden in minimal mode
  if (!IS_MINIMAL_TOOLS) {
    registerProcessAdrTool();
    registerFixTool();
  }

  registerProcessHandoffTool(); // Build BM25 search index (async, non-blocking)
  const { buildIndex, clearIndex } = await import("../bm25/index.js");

  if (force) {
    clearIndex();
  }

  buildIndex();
  const { registerTemplateTool } = await import("../scaffold/templates/index.js");

  registerTemplateTool();

  // Enforce the minimal surface as a hard allowlist - guarantees a small, fixed
  // tool list regardless of what the register* calls above added.
  if (IS_MINIMAL_TOOLS) {
    retainTools(MINIMAL_ALLOWLIST);
  }
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
 * @param {string} content - Full SKILL.md content
 * @returns {{ name?: string, description?: string, tags?: string[], frameworks?: string[] }}
 */
export { parseSkillFrontmatter } from "./_frontmatter.js";
/**
 * Get skill metadata (parsed from YAML frontmatter).
 * Results are cached in the LRU cache.
 *
 * @param {string} skillName - e.g. "rule-frontend-react"
 * @returns {{ name?: string, description?: string, tags?: string[], frameworks?: string[] }}
 */
export { getSkillMetadata } from "../../tools/router/index.js";
/**
 * Extract the "Project Scaffolding" section from a SKILL.md file.
 * Looks for the section between the scaffold heading and the next section.
 *
 * @param {string} content - Full SKILL.md content
 * @returns {string} - The extracted scaffolding section text
 */
export { extractScaffoldSection } from "../scaffold/_parser.js";
/**
 * Extract a single scaffold file's content from the scaffolding section.
 * Matches by file name in a markdown heading (e.g. ### `.prettierrc`).
 *
 * @param {string} section - The extracted scaffolding section text
 * @param {string} fileName - The config file name (e.g. ".prettierrc")
 * @returns {{ isError?: boolean, content: Array<{ type: string, text: string }> }}
 */
export { extractSingleScaffoldFile } from "../scaffold/_parser.js";
/**
 * Register the pix_detect tool for project framework detection.
 */
