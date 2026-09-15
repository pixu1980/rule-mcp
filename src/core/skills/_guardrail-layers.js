/** @module core/skills/guardrail-layers - install the rules the skills own */

/**
 * Resolve the three skill layers and hand the guardrail engine the rules each
 * skill owns (ADR 079).
 *
 * Called before any tool registers, so the first check already sees them. What
 * a layer could not load is reported by the loader and stepped over: a broken
 * custom skill must not stop the server starting.
 */
export async function installSkillGuardrails() {
  const { loadLayerGuardrails } = await import("../layers/_guardrails.js");
  const { setSkillGuardrails } = await import("../guardrails/index.js");

  setSkillGuardrails(await loadLayerGuardrails());
}
