# 115: Map tools, slash commands, and skills into one surface

- **Date**: 2026-09-22
- **Status**: accepted
- **Tags**: tools, commands, skills, breaking, compress, handoff
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The live surface mixed three naming systems that looked alike but meant different things: MCP tools (`pix_tool_*`, underscore), agent slash commands (`/pix-*`, dash), and skills (`pix-*`, dash). Interview mapping (2026-09-22) kept the skill-area triple and the persona fan-out, then converged the session and action edges that duplicated each other.

## Decision

### Keep

1. Skill-backed tool↔skill 1:1: `pix_tool_<x>` ↔ skill `pix-<x>`. Area slash is hub-only `/pix-area-<area>` (ADR 117); leaves route from free text on the collector.
2. Check forms: `pix_tool_check`, `/pix-check`, and keyword intent on `/pix-area-*` hubs (ADR 116).
3. Personas: 57 `/pix-persona-*-{plan|audit|review}` → `pix_tool_plan` / `pix_tool_audit` / `pix_tool_review` (+ `pix_tool_plan_docs` tool-only).
4. Router: `pix_tool` and `/pix`. Update: `pix_tool_update` and `/pix-update`. ADR area: `pix_tool_process_adr` + skill + `/pix-area-process-adr*`.
5. Tool-only: `pix_tool_gateway`, `pix_tool_apply`, `pix_tool_search`, `pix_tool_detect`, `pix_tool_plan_docs`.
6. No mass rename of `pix_tool_*` (underscore tools stay; slash stays dash).

### Converge (BREAKING)

1. **Handoff**: only `/pix-handoff` + `pix_tool_handoff`. Drop skill `pix-process-handoff`, `/pix-area-process-handoff*`, and `pix_tool_process_handoff`.
2. **Handon**: `/pix-handon` + `pix_tool_handon` (rename from `pix_tool_process_handon`). No skill.
3. **Compress**: `/pix-compress` + `pix_tool_compress` is the sole compression engine (prompt/context preprocessing and prose postprocessing). Drop skill/tool/area `pix-process-compression`.
4. **Init**: add `pix_tool_init` aligned with `/pix-init`.
5. **Stats / usage**: keep tools; add `/pix-stats` and `/pix-usage`.
6. **Remove tools** (use slash/skill styleguide or persona a11y instead): `pix_tool_form`, `pix_tool_scaffold`, `pix_tool_component`, `pix_tool_a11y_report`.

## Consequences

MCP tool count falls (removed form/scaffold/component/a11y_report/process-compression skill-tool; renames handoff/handon; add init). Agent slash count drops by the process-handoff and process-compression area(+check) commands, gains `/pix-compress`, `/pix-stats`, `/pix-usage`. Callers of removed names must switch with no aliases.

## What would end this

Evidence that styleguide/persona surfaces cannot replace form/scaffold/component/a11y_report, or that prompt/context compression needs a separate skill again.

## Alternatives Considered

1. Keep process-compression as policy skill and compress as thin runtime (rejected: one engine)
1. Keep `/pix-area-process-handoff` beside `/pix-handoff` (rejected: dual slash)
1. Kebab MCP tool names equal to skills (rejected: tools stay underscore, slash stay dash)
