

/**
 * @module core/skills/load
 *
 * The skill catalog loader: three named phases and the orchestrator that runs
 * them.
 *
 * The loader is the one module that knows every tool family, so it is the
 * module most likely to grow a new one. Naming the phases keeps that growth
 * testable: what a reload clears, what the catalog owns itself, and what is
 * minted per skill are three separate answers.
 *
 * Every import here is static. An `await import()` hides an edge from the
 * coupling graph, which is the measurement the phase split exists to protect.
 *
 * Called once at startup, or on demand via `skills reload`.
 */

import { registerA11yReportTool } from "../../tools/a11y/index.js";
import { registerActionTools } from "../../tools/actions/index.js";
import { registerProcessAdrTool } from "../../tools/adr/index.js";
import { registerAiTool } from "../../tools/ai/index.js";
import { registerFixTool } from "../../tools/fix/index.js";
import { registerProcessHandoffTool } from "../../tools/handoff/index.js";
import { registerProcessHandonTool } from "../../tools/handon/index.js";
import { registerMetaTool } from "../../tools/meta/index.js";
import { clearSkillResolution, clearTools } from "../../tools/router/index.js";
import { registerCheckTool, registerScaffoldTool, registerSearchTool } from "../../tools/skill/index.js";
import { buildIndex, clearIndex } from "../bm25/index.js";
import { cacheClear, clearSkillDigests } from "../cache/tool-cache/index.js";
import { registerTemplateTool } from "../scaffold/templates/index.js";
import { registerDetectTool } from "./_detect-tool.js";
import { installSkillGuardrails } from "./_guardrail-layers.js";
import { skillCache } from "./_lru.js";
import { IS_MINIMAL_TOOLS } from "./_minimal.js";
import { registerSkillTools as registerPerSkillTools } from "./_skill-tools.js";
import { retainSurface } from "./_surface-retain.js";

let isLoaded = false;

/**
 * Clear what a reload starts from: the skill cache, the tool registry, the
 * resolved-skill memo, the deterministic result cache and the search index.
 *
 * The result cache goes because its entries were computed from the skill text
 * that is about to change: replaying one would answer from a catalog that no
 * longer exists.
 */
export function resetForReload() {
  isLoaded = false;
  skillCache.clear();
  clearTools();
  clearSkillResolution();
  cacheClear();
  clearSkillDigests();
  clearIndex();
}

/**
 * Register the families the catalog owns: everything that is not minted per
 * skill, plus the index and the templates the skill tools read.
 *
 * The gateway and the apply tool are deliberately absent. They belong to the
 * invocation path the catalog is loaded by, and `bootstrapCoreTools()` is what
 * registers them from a startup entry point.
 *
 * @returns {Promise<void>}
 */
export async function registerCoreTools() {
  await installSkillGuardrails();
  registerAiTool();
  // In code: minimal mode mints no skill tool, and this one is allowlisted (ADR 075).
  registerMetaTool();
  registerSearchTool();
  registerCheckTool();
  registerScaffoldTool();
  registerDetectTool();
  // Action tools: the collection-helpers of the rule surface. All read-only
  // except the plan/plan-docs writers, which are operationally useful in every
  // mode.
  registerActionTools();
  registerA11yReportTool();
  registerProcessHandonTool();

  // Mutation tools: hidden in minimal mode
  if (!IS_MINIMAL_TOOLS) {
    registerProcessAdrTool();
    registerFixTool();
  }

  registerProcessHandoffTool();
  // The index is built from the skill files on disk, not from the tools
  // registered above, so it does not wait for the per-skill pass.
  buildIndex();
  registerTemplateTool();
}

/**
 * Register one tool per skill that asks for one, in the skill catalog's order.
 */
export function registerSkillTools() {
  registerPerSkillTools();
}

/**
 * Enforce the surface the process was started with, after everything is
 * registered: the installer's answer when it gave one, the full surface when it
 * did not.
 *
 * Minimal mode is not enforced here: a tool outside its allowlist is never
 * registered (see the tool registry), so there is nothing left to cut.
 */
function applySurface() {
  retainSurface();
}

/**
 * Load the whole catalog: reset when forced, the core families, then the
 * per-skill tools, then the surface policy.
 *
 * Idempotent - subsequent calls are no-ops unless `force` is true.
 *
 * @param {boolean} [force=false] - Force re-load even if already loaded
 * @returns {Promise<void>}
 */
export async function loadAllSkills(force = false) {
  if (isLoaded && !force) {
    return;
  }

  if (force) {
    resetForReload();
  }

  isLoaded = true;
  await registerCoreTools();
  registerSkillTools();
  applySurface();
}
