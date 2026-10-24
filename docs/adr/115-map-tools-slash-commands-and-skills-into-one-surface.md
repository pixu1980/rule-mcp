# 115: Map tools, slash commands, and skills into one surface

- **Date**: 2026-09-22
- **Status**: accepted
- **Tags**: tools, commands, skills, breaking, compress, handoff
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The live surface mixed three naming systems that looked alike but meant different things: MCP tools (`rule_tool_*`, underscore), agent slash commands (`/rule-mcp-*`, dash), and skills (`rule-mcp-*`, dash). Interview mapping (2026-09-22) kept the skill-area triple and the persona fan-out, then converged the session and action edges that duplicated each other.

## Decision

### Keep

1. Skill-backed tool↔skill 1:1: `rule_tool_<x>` ↔ skill `rule-mcp-<x>`. Area slash is hub-only `/rule-area-<area>` (ADR 117); leaves route from free text on the collector.
2. Check forms: `rule_tool_check`, `/rule-check`, and keyword intent on `/rule-area-*` hubs (ADR 116).
3. Personas: 57 `/rule-persona-*-{plan|audit|review}` -> `rule_tool_plan` / `rule_tool_audit` / `rule_tool_review` (+ `rule_tool_plan_docs` tool-only).
4. Router: `rule_tool` and `/rule`. Update: `rule_tool_update` and `/rule-update`. ADR area: `rule_tool_process_adr` + skill + `/rule-area-process-adr*`.
5. Tool-only: `rule_tool_gateway`, `rule_tool_apply`, `rule_tool_search`, `rule_tool_detect`, `rule_tool_plan_docs`.
6. No mass rename of `rule_tool_*` (underscore tools stay; slash stays dash).

### Converge (BREAKING)

1. **Handoff**: only `/rule-handoff` + `rule_tool_handoff`. Drop skill `rule-mcp-process-handoff`, `/rule-area-process-handoff*`, and `rule_tool_process_handoff`.
2. **Handon**: `/rule-handon` + `rule_tool_handon` (rename from `rule_tool_process_handon`). No skill.
3. **Compress**: `/rule-compress` + `rule_tool_compress` is the sole compression engine (prompt/context preprocessing and prose postprocessing). Drop skill/tool/area `rule-mcp-process-compression`.
4. **Init**: add `rule_tool_init` aligned with `/rule-init`.
5. **Stats / usage**: keep tools; add `/rule-stats` and `/rule-usage`.
6. **Remove tools** (use slash/skill styleguide or persona a11y instead): `rule_tool_form`, `rule_tool_scaffold`, `rule_tool_component`, `rule_tool_a11y_report`.

## Consequences

MCP tool count falls (removed form/scaffold/component/a11y_report/process-compression skill-tool; renames handoff/handon; add init). Agent slash count drops by the process-handoff and process-compression area(+check) commands, gains `/rule-compress`, `/rule-stats`, `/rule-usage`. Callers of removed names must switch with no aliases.

## What would end this

Evidence that styleguide/persona surfaces cannot replace form/scaffold/component/a11y_report, or that prompt/context compression needs a separate skill again.

## Alternatives Considered

1. Keep process-compression as policy skill and compress as thin runtime (rejected: one engine)
1. Keep `/rule-area-process-handoff` beside `/rule-handoff` (rejected: dual slash)
1. Kebab MCP tool names equal to skills (rejected: tools stay underscore, slash stay dash)
