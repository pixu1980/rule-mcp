# 114: Flight is process-area guidance injected on every prompt, not a slash command

- **Date**: 2026-09-22
- **Status**: accepted
- **Tags**: commands, prompts, telemetry, directive, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

ADR 113 renamed `/rule-mcp-flight` to `/rule-mcp-process-flight` and kept it as an exposed one-shot task prompt and agent slash command. Costing the server is not a user-invoked workflow like handoff or init: every session that forgets to check the recorder wastes the signal the telemetry already collected. A slash that only runs when remembered is the wrong shape.

## Decision

1. Drop `/rule-mcp-process-flight` (and any `rule-mcp-flight` leftover) from the MCP prompt registry and from agent command install. It is not listed, not aliased, and not an area skill.
2. Keep the conceptual id `rule-mcp-area-process-flight` under the process namespace for docs and the injected heading only.
3. Inject flight automatically with the harness directive: SessionStart carries the full block (export / show / prune / `rule_tool_stats`, read KPIs, propose only what the recorder supports); UserPromptSubmit re-anchors with `flight when costing.` on every prompt.
4. Opt out with `RULE_MCP_NO_FLIGHT=1` without silencing the rest of the session directive. `RULE_MCP_NO_PROMPT_DIRECTIVE=1` still silences the whole inject, flight included.

## Consequences

Agent slash commands fall by one (246 to 245). MCP prompts fall by one (153 to 152). Session and per-prompt context grow by the flight block / fragment unless opted out. Callers of `/rule-mcp-process-flight` must rely on the automatic inject or run `rule-mcp telemetry` / `rule_tool_stats` directly. ADR 113 item 1 is superseded for flight.

## What would end this

Evidence that the per-prompt fragment costs more tokens than the sessions it saves, or a product need for an explicit slash that outweighs automatic injection.

## Alternatives Considered

1. Keep `/rule-mcp-process-flight` as an optional slash beside the inject (two truths; slash stays forgotten)
1. Fold flight only into the workflow reminder on tool results (too late: the model already chose what to do)
1. Add a `rule-mcp-process-flight` skill and `/rule-mcp-area-process-flight` area command (exposes a surface the user asked not to list)
