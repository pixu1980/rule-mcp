/**
 * @module tools/actions
 *
 * The action-tool family: compress, init, plan, impersonation, stats, usage, update.
 * The catalog registers them through `registerActionTools`, one call per family
 * rather than siblings of the tools barrel.
 */
import { registerCompressTool } from "./_compress.js";
import { registerFixTool } from "../fix/index.js";
import { registerStructuralTool } from "../structural/index.js";
import { registerGitTool } from "./_git.js";
import { registerInitTool } from "./_init.js";
import { registerImpersonationTool } from "./_impersonation.js";
import { registerPlanTool } from "./_plan.js";
import { registerStatsTool } from "./_stats.js";
import { registerSyncTool } from "./_sync.js";
import { registerUpdateTool } from "./_update.js";
import { registerUsageTool } from "./_usage.js";

export * from "./_compress.js";
export * from "./_git.js";
export * from "./_init.js";
export * from "./_impersonation.js";
export * from "./_plan.js";
export * from "./_stats.js";
export * from "./_sync.js";
export * from "./_update.js";
export * from "./_usage.js";
export { registerStructuralTool } from "../structural/index.js";

/**
 * Register every action-family tool. Idempotent at the registry level.
 */
export function registerActionTools() {
  registerCompressTool();
  registerFixTool();
  registerStructuralTool();
  registerGitTool();
  registerInitTool();
  registerPlanTool();
  registerImpersonationTool();
  registerStatsTool();
  registerSyncTool();
  registerUsageTool();
  registerUpdateTool();
}
