# 120: Fold the per-operation persona commands into one per role, with the depth read from the request

- **Date**: 2026-09-23
- **Status**: accepted
- **Tags**: commands, personas, prompts, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The persona surface generated one prompt, one slash command and one skill per active role and operation: 19 roles x 3 operations = 57 names, plus the older rule-mcp-{plan|audit|review}-* names before them. The operation was a suffix the user had to choose before typing. Most runs start as an audit, a review is derived from the audit, and a plan from the review, so the stage is a property of the request more than of the command. ADR 116 had already folded the per-area check siblings into the parent for the same reason, and left the parents to read the mode from $ARGUMENTS.

## Decision

1. One prompt, one slash command and one skill per role: rule-mcp-persona-<role> (57 to 19 on each surface). 2. The depth is read from the request by a single whole-token keyword module, core/review/roles/operation-intent, English and Italian, accent-insensitive: a request that names a plan runs operation=plan, a request that names a review runs operation=review, anything else runs operation=audit. Plan outranks review when both appear. 3. The operations are cumulative: review runs the audit first and derives docs/reviews/ from it, plan runs the audit, the review and the plan. The operation enum on rule_tool_plan is unchanged (plan|audit|review|all); the template makes the deeper operation include the shallower ones. 4. Every surface reads the same intent: the MCP prompt resolver decides server-side from `topic`, the agent command body states the rule over $ARGUMENTS, and the generated persona skill embeds the same keyword lists. 5. The old names are deleted, not aliased: agent-command sync purges every stale rule-mcp-persona-* file in every target directory, skills-install purges the old per-operation and legacy skill directories.

## Consequences

The persona surface drops from 57 to 19 on all three surfaces (prompts 37, slash commands 39, README counts updated). The user no longer names the stage: the request does, in English or Italian. Whole-token matching keeps a false positive like "plane" out. A request that mentions a plan by accident runs the deepest ladder, which produces more documents than asked; the deepest explicitly named stage winning is the tradeoff that keeps the rule simple. Callers of /rule-mcp-persona-<role>-audit switch to /rule-mcp-persona-<role> with no keyword, -review becomes "review ...", -plan becomes "plan ...".

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the 57 commands and add a fourth umbrella command (rejected: more surface and the same drift).
1. Decide the operation only in the model, with no shared intent module (rejected: the prompt resolver, the command body and the generated skill would each carry their own keyword list and drift apart).
1. Add a new operation value audit-review to the tool enum (rejected: making review and plan cumulative fixes the behavior without growing the public contract).
1. Keep deprecated aliases for the old names (rejected: ADR 115 and ADR 116 keep the removed names removed).
