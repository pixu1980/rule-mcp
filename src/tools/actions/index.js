

/**
 * @module tools/actions
 *
 * The action-tool family: compress, init, plan, plan-docs, stats, usage, update.
 * The catalog registers them through `registerActionTools`, one call per family
 * rather than siblings of the tools barrel.
 */
import { registerCompressTool } from "./_compress.js";
import { registerFixTool } from "../fix/index.js";
import { registerInitTool } from "./_init.js";
import { registerPlanDocsTool } from "./_plan-docs.js";
import { registerPlanTool } from "./_plan.js";
import { registerStatsTool } from "./_stats.js";
import { registerUpdateTool } from "./_update.js";
import { registerUsageTool } from "./_usage.js";

export * from "./_compress.js";
export * from "./_init.js";
export * from "./_plan-docs.js";
export * from "./_plan.js";
export * from "./_stats.js";
export * from "./_update.js";
export * from "./_usage.js";

/**
 * Register every action-family tool. Idempotent at the registry level.
 */
export function registerActionTools() {
  registerCompressTool();
  registerFixTool();
  registerInitTool();
  registerPlanTool();
  registerPlanDocsTool();
  registerStatsTool();
  registerUsageTool();
  registerUpdateTool();
}
