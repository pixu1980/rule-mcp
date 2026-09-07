/**
 * The English-only + American-spelling mandate (hardening request: "always
 * English, always US spelling, on every prompt and every generated file").
 *
 * Every guardrail is wired so rule_tool_check enforces it on EVERY skill, a
 * dedicated skill carries the house rules + the canonical wordlist, and every
 * prompt/command surface announces the mandate so agents inherit it before a
 * single check runs.
 *
 * Pinned here:
 *   - `fp-american-english` (British → US) and `en-english-only-prose`
 *     (foreign-language prose) both run for EVERY skill;
 *   - comments and identifiers with non-English content are flagged, English
 *     ones pass;
 *   - a generated markdown document is checked as whole-prose in docs mode;
 *   - the rule-styleguide-english skill exists, is routed, and its advertised
 *     US/UK pairs are exactly the ones the fingerprint dictionary catches
 *     (no drift between what a skill tells a model and what the gate blocks);
 *   - every shared prompt/command surface carries the mandate.
 */

export { checkCode, getGuardrails } from "../../../guardrails/index.js";
export { findFingerprints } from "../../fingerprint/index.js";

const { loadAllSkills } = await import("../../../skills/index.js");

await loadAllSkills(true);
