# 048: Measure the tool surface before optimizing it, then guard the number

- **Date**: 2026-08-30
- **Status**: accepted
- **Tags**: performance, tokens, tools, mcp, ci
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The tool surface is the only output this server sends on every model turn, before the model has decided to do anything. A skill file costs tokens when someone loads it; a tool schema costs tokens always. The plan's performance workstream said to audit descriptions down to one line each and add MCP annotations, which was a reasonable guess written without a measurement. The first run of the report showed the guess was wrong. Descriptions were 3,431 tokens, an eighth of the total. Input schemas were 22,387, and most of that was one thing: 85 skill tools each advertising the same eight properties with the same seven descriptions, so a sentence like "Code to validate (required for mode=check)" was serialized 85 times per turn to say what the field name already said.

## Decision

Measure first. scripts/tool-surface-report.mjs reports the weight and its distribution, and test/tool-surface-budget.test.mjs enforces a ceiling in CI alongside three properties that protect the prompt cache and the data path: registration order is deterministic, no description embeds a version, date or absolute path, and a JSON tool result is still parseable after the compression and fingerprint passes. Then cut, in order of what the measurement showed: drop the property descriptions repeated across 85 skill tools, drop the mode gloss that was duplicated in each tool's own description, advertise `file` only on the tool that reads it, omit an empty `required` array, and trim the four descriptions over 60 tokens. Add MCP annotations but emit only what differs from the protocol default, since `readOnlyHint: false` is already assumed and spelling it out cost 2,000 tokens a turn to say nothing. Separately, two error paths were paying for themselves: an unknown skill name listed all 87 skills at 537 tokens to answer a typo, now three near matches at 40, and pix_search emitted index diagnostics on every result, now behind a verbose flag.

## Consequences

The surface fell from ~27,400 to ~16,300 tokens, a 41% cut paid back on every turn of every session. The budget is set at 16,500, a little above where the surface honestly lands, because a budget is a regression guard and not a target: a new tool should pass, a new paragraph duplicated across 85 tools should not. It was tempting to keep pushing to the 16,000 first written down, and the remaining 300 tokens would have come out of information the model actually uses. The history table lives in the budget module so the next person raising it can see what each cut bought. What is deliberately not done: skill tools still advertise the four check-mode properties even though pix_check exists as a dedicated tool, because removing them from the zod schema would reject callers that pass them, and making listTools prefer the hand-written schema over the zod one inverts an existing design decision for a few hundred tokens.
