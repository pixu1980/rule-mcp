# 088: A persona topic is the binding scope of the run

- **Date**: 2026-09-12
- **Status**: accepted
- **Tags**: personas, prompts, review, tokensave
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The persona surfaces (54 prompts, 54 agent commands, rule_tool_plan) accepted a free-text topic, but the filled template injected it as one soft line (Focus this run on) after the lens list, while the opening action line and the operation contract still said the whole project. The stronger, repeated instruction won: a scoped request still produced whole-project runs. Worse, a scoped run reported fewer findings, and mergeFindings flipped every unreported open finding to resolved, corrupting the audit/review/plan trio bookkeeping.

## Decision

The topic becomes the binding scope everywhere the template speaks: the action line names the scope instead of the project, a dedicated 'Scope: binding' section forbids reading, auditing or reporting outside it (with a one-line 'Out of scope observations' escape valve), the lenses are reframed as 'applied to the scope above' with a 'not applicable' exit, and the operation contract states the scope and orders it passed to rule_tool_plan_docs. A scoped run also gets a 'Resolve the scope' section telling the agent to map the scope to concrete files and symbols with tokensave_context/tokensave_files/tokensave_impact; rule_tool_plan detects .tokensave/ in projectDir and states availability, other surfaces instruct a tokensave_status probe. rule_tool_plan_docs gains a scope parameter: with it, mergeFindings preserves unreported findings untouched (no resolve flip, no prune). rule_tool_plan is now non-cacheable because its output depends on the filesystem. Without a topic every surface is byte for byte what it always was.

## Consequences

A user request like /rule-audit-security the SSE daemon now produces a run confined to that scope, and repeated scoped runs no longer mark whole-project findings resolved by silence. The trio headers record the scope of the last run. Cost: a scoped run can never close findings outside its scope, so a periodic whole-project run is still what retires them; and rule_tool_plan answers are recomputed on every call, which is cheap string work.

## What would end this

This leans on the assumption that a prompt-level contract is enough to confine the run: no code enforces the boundary. Scoped runs that still read and report across the whole project, or agents that skip the scope parameter and corrupt the trio anyway, would prove instruction is not enforcement and push the scope into rule_tool_plan_docs validation instead.

## Alternatives Considered

1. Keep the soft focus line and rely on the model to narrow - rejected: the whole-project action line dominated and the scope was ignored
1. Per-topic output files (docs/audits/<role>-<slug>.md) - rejected as scope creep: one file per role stays, the header records the scope
1. Have the server call tokensave itself at generation time - impossible: tokensave is a separate MCP server mediated by the client, the generator stays deterministic
