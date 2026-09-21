

/**
 * @module tools/actions
 *
 * The action-tool family: compress, plan, plan-docs, stats, usage, and update.
 * The catalog registers them through `registerActionTools`, one call per family
 * rather than six siblings of the tools barrel.
 */
import { registerCompressTool } from "./_compress.js";
import { registerPlanDocsTool } from "./_plan-docs.js";
import { registerPlanTool } from "./_plan.js";
import { registerStatsTool } from "./_stats.js";
import { registerUpdateTool } from "./_update.js";
import { registerUsageTool } from "./_usage.js";

export * from "./_compress.js";
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
  registerPlanTool();
  registerPlanDocsTool();
  registerStatsTool();
  registerUsageTool();
  registerUpdateTool();
}
