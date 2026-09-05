# 074: The workflow reminder is stated once a session and re-anchored on a cadence

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: tokens, enforcement, telemetry, defaults
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The flight recorder made the contradiction measurable: real exports showed measuredSaved ~0 for caveman compression against reminderOverhead ~460 tokens per session, so the contract this server appended to every single tool result cost more than the compression it advertised saved. Measured on the decoration path over a 30-call, 8-tool session, the old cadence (full contract on the first call per tool, terse one-liner on every call after) put a reminder on 30 of 30 results and cost 3820 tokens, ~127 per call. A rule the model has already read nine times is also the rule it learns to skim, so the repetition was buying attrition rather than compliance.

## Decision

The reminder is emitted once per session and re-anchored periodically instead of riding every result. The first decorated result of a process carries the full contract; every Nth result after it carries the terse one-liner; the results in between carry nothing. N is RULE_MCP_REMINDER_EVERY, default 5, where 1 restores a reminder on every call and 0 sends the opening contract and never repeats it; an unreadable value falls back to the default rather than to silence. Both forms were shortened without dropping a rule: evidence as source of truth, missing evidence means unknown, minimal change, the unprompted ADR, no subagents, the dependencies policy, the layout rule where CSS is on the table, and the mantra all survive. The counter is per process, which is what a session is for a stdio server, and the decoration still runs after the cache so a replayed core never replays somebody else's reminder. Measured after: 7 reminders over the same 30-call session, 581 tokens, ~19 per call, a reduction of 85 percent against a plan target of 60.

## Consequences

A model that ignores the opening contract now has four quiet calls before the next re-anchor rather than an immediate repeat, which is the trade being made deliberately: the routing corpus and the full ci suite are green, but compliance over a long session is not something ci can assert, so RULE_MCP_REMINDER_EVERY=1 exists as the way back. The stale tokensave branch line and the autoTrackBranch call ride the reminder, so both now fire on a cadence instead of on every call. Two suites had to pin the cadence to observe the shapes they were already testing (test/enforcement.test.mjs and one case in test/css-flex-first.test.mjs), and the deps-policy assertions in the enforcement suite now read the opening contract from a fresh process, since the file has already spent its first call. Cache hits still record no coreTokens or finalTokens, so reminder overhead on a hit stays unmeasured and the reported figure remains a lower bound. test/reminder-diet.test.mjs blocks in ci with the before number, 3820 tokens, written into it as the divisor.

## Alternatives Considered

1. Keep the per-tool cadence and only shorten the wording: the wording is the smaller half of the cost, and 30 reminders of any length still dominate the budget
1. Drop the reminder entirely and rely on the SessionStart and UserPromptSubmit hooks: the hooks reach agents that install them, and a tool result is the only surface that reaches every MCP client
1. Emit the contract only on the router tool: the router payload already carries scope_contract as data, but tools called without a routing step would then see no contract at all
1. Make the cadence adaptive to session length or tool identity: more state to reason about and to test, for a saving the fixed cadence already books
