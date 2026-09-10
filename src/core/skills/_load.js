

/**
 * @module core/skills/load
 *
 * Skill loading and registration: read the catalog from disk, register one MCP
 * tool per skill, and register the dispatcher and action tools beside them.
 * The per-tool registration logic lives in `tools/skill/`.
 *
 * Runs once at startup, or on demand via `skills reload`.
 */

import { getSkillNames, clearTools, retainTools } from "../../tools/router/index.js";
import { registerSkillTool, registerSearchTool, registerCheckTool, registerScaffoldTool } from "../../tools/skill/index.js";
import { registerAiTool } from "../../tools/ai/index.js";
import { registerMetaTool } from "../../tools/meta/index.js";
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
  registerMetaTool();
  const { registerUpdateTool } = await import("../../tools/index.js");
  registerUpdateTool();
  await registerGatewayTool();
  await registerApplyTool();

  const skillNames = getSkillNames();

  for (const name of skillNames) {
    // In minimal mode, skip skill-specific tools - evidence is loaded via pix_gateway
    if (name !== "rule" && name !== "rule-meta" && name !== "rule-process-adr" && name !== "rule-process-handoff" && !IS_MINIMAL_TOOLS) {
      registerSkillTool(name);
    }
  }

  registerSearchTool();
  registerCheckTool();
  registerScaffoldTool();
  registerDetectTool();
  const { registerCompressTool } = await import("../../tools/index.js");
  registerCompressTool();
  // Action tools: the collection-helpers of the rule surface. All read-only
  // except the plan/plan-docs writers, which are operationally useful in every
  // mode.
  const { registerPlanTool } = await import("../../tools/index.js");
  registerPlanTool();
  const { registerPlanDocsTool } = await import("../../tools/index.js");
  registerPlanDocsTool();
  const { registerStatsTool } = await import("../../tools/index.js");
  registerStatsTool();
  const { registerUsageTool } = await import("../../tools/index.js");
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

export * from "./_reexports.js";

/**
 * Register the pix_detect tool for project framework detection.
 */
