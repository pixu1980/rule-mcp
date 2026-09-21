

/**
 * @module tools/bootstrap
 *
 * The core tools the invocation path itself depends on.
 *
 * The gateway calls the router and the apply tool writes what a receipt
 * validated, so both sit above the catalog rather than inside it: when
 * loadAllSkills registers them, the catalog imports the invocation path that
 * loads the catalog. A startup entry point registers them once, here, and the
 * catalog keeps to the per-skill tools.
 *
 * This module is deliberately not `src/tools/index.js`: the barrel is what the
 * catalog imports for the action tools, so a barrel-level import of the gateway
 * would put the same edge straight back.
 */

import { registerApplyTool } from "./apply/index.js";
import { registerGatewayTool } from "./gateway/index.js";

/**
 * Register the gateway and the apply tool. Idempotent at the registry level, so
 * a second call from a second entry point in the same process is harmless.
 *
 * @returns {Promise<void>}
 */
export async function bootstrapCoreTools() {
  await registerGatewayTool();
  await registerApplyTool();
}
