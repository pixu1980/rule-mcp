/**
 * @module core/tool-budget
 *
 * The ceiling on what `tools/list` may cost.
 *
 * This is the only output paid on every model turn, before the model has
 * decided to do anything, so it is the one number worth guarding in CI. A skill
 * file costs tokens when someone loads it. A tool schema costs tokens always.
 *
 * The budget is a regression guard, not a target. It sits a little above where
 * the surface honestly lands, so a new tool is fine and a new duplicated
 * paragraph on every skill tool is not.
 *
 * Raising it is a deliberate act: every future turn of every user gets more
 * expensive. Trim first, and if the trim is not there, say so in the commit.
 *
 * @see scripts/tool-surface-report - the measurement
 * @see test/tool-surface-budget.test.mjs - the guard
 */

/**
 * Budget for the full tool surface, in tokens (char/4 heuristic).
 *
 * History, from the P7 audit:
 *
 * | Surface  | What changed                                                  |
 * |----------|---------------------------------------------------------------|
 * | ~27,400  | Before. Descriptions were 12% of it; schemas were 82%          |
 * | ~17,600  | Dropped the seven property descriptions repeated on every skill tool|
 * | ~15,300  | Dropped the mode gloss duplicated in each tool's description   |
 * | ~16,700  | Added MCP annotations (+2k, then trimmed to non-defaults only)  |
 * | ~16,300  | Trimmed four long descriptions, omitted empty `required`        |
 * | ~16,440  | R0 added the i18n skill: 88 skills, 100 tools                   |
 * | ~16,520  | R1 added `pix_process_handon`, minus a 69-token trim         |
 * | ~13,820  | R4 stopped advertising three check-only fields on 87 tools       |
 * | ~14,080  | R4 added two AI skills: 90 skills, 103 tools                     |
 *
 * The measurement is what redirected the work: the plan assumed descriptions
 * were the weight, and they were an eighth of it.
 *
 * R1 is the first raise. The trim came first and it was real - six `include*`
 * booleans on `pix_process_handoff` carried descriptions that restated their
 * own property names, which is the exact fat the P7 audit found - but 69 tokens
 * do not pay for a 150-token tool, and there was no second trim of that size
 * that was not just deleting something a caller needs. So the ceiling moves,
 * once, by the smallest amount that leaves the guard useful.
 *
 * R4 brought the ceiling down rather than up. Two findings.
 *
 * The number first: over 1,340 real calls, 58% arrived at the router, 25% at an
 * action tool, 8% at the gateway and 8% straight at a skill tool - and only two
 * of the eighty-seven skill tools had ever been called. That is one machine and
 * mostly this repository's own sessions, so it argues for a shape change rather
 * than proving one, and it is recorded in ADR 055 for R8 to act on.
 *
 * Then the trim, larger than any raise. `listTools()` derives the advertised
 * schema from the zod schema whenever one is present, so a hand-written
 * `inputSchema` beside a zod schema is dead code. Tools declare `advertise`,
 * which narrows what `tools/list` shows without narrowing what the tool
 * accepts. Dropping three check-only fields from 87 skill tools freed ~2,700
 * tokens per turn.
 *
 * So the budget was 14,500, tighter than it had ever been, with the surface at
 * ~14,080.
 *
 * | ~14,080  | R8 raised the ceiling to 20,000 without spending it              |
 *
 * R8 is the phase ADR 055 handed the shape question to, and the measurement it
 * asked for came back sharper than before: the 89 per-skill tools are about 80%
 * of the surface, the skill path carried 7.7% of calls, and exactly one of the
 * eighty-seven skill tools had ever been called. The trim was therefore
 * available and larger than any raise: not advertising those tools frees roughly
 * three quarters of what `tools/list` costs on every turn.
 *
 * It was not taken. The decision was to raise the ceiling to 20,000 and keep
 * every skill tool advertised, which is recorded here because this file's own
 * rule is to say so when the trim exists and is not taken. The surface stays
 * around 14,700 once R8's five skills land, so the guard still catches a
 * duplicated paragraph across 90 tools; what it no longer does is force the
 * question. The number that would reopen it is in ADR 055 and in this phase's
 * own ADR, and the sample behind it remains one machine.
 */
export const TOOL_SURFACE_BUDGET_TOKENS = 26_000;

// The first raise on the rule surface happened when the 6 item-9 action tools
// landed (plan, plan-docs, stats, usage, a11y_report, process_handon at 97
// tools): their schemas are naturally wide (usage carries the agent's token
// fields one by one), a 400-token trim of descriptions was taken first, and
// the remaining ~870 tokens are the schemas' real weight rather than
// duplication. The ceiling moves once and the note is the rule keeping it
// honest: trim first, and if the trim is not there, say so.
