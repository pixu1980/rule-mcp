# 117: Area slash commands are collectors only; leaves route from the prompt

- **Date**: 2026-09-22
- **Status**: accepted
- **Tags**: commands, prompts, areas, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

After ADR 115–116 every skill still minted a slash `/rule-area-<area>-<member>` beside the hub `/rule-area-<area>`. That ~80 leaf commands duplicated the skill catalog on the agent command bar. Callers already write free text on the hub (`/rule-area-toolchain set up rspack pnpm eslint husky`); the leaf slash names add no routing the hub cannot do via `pix_tool` and the member `rule_tool_*` tools.

## Decision

1. **Slash and MCP area prompts**: emit only hub collectors (`/rule-area-ai`, `/rule-area-backend`, …). Drop every `/rule-area-<area>-*` member prompt/command. No aliases.
2. **Tools and skills unchanged**: every leaf skill and `rule_tool_<leaf>` remains registered and callable.
3. Hub prompt/body instructs: parse `$ARGUMENTS`, call `pix_tool` (and/or the named leaf `rule_tool_*`) for each topic the request names (e.g. rspack → `rule_tool_toolchain_rspack`), load that skill evidence, then implement/check as today. Check-intent keywords (ADR 116) still flip the hub into guardrail-only mode against the routed skill(s).
4. `areaCommandName(skill)` for a member returns the hub command `rule-area-<area>` so docs and helpers point at the collector.
5. Install presets: area family is always hubs; `full` no longer writes one slash per skill. Personas and session/tasks unchanged.

## Consequences

Agent slash and MCP area-prompt counts fall by one per leaf skill (~78). Install sync purges stale `rule-area-*-<member>.*` files. Callers of `/rule-area-frontend-react` switch to `/rule-area-frontend` with "react" (or equivalent) in the request, or call `rule_tool_frontend_react` directly. ADR 115's slash side of the 1:1 triple becomes hub-only; the tool↔skill 1:1 stays.

## What would end this

Evidence that free-text routing on hubs misses leaf skills often enough that dedicated leaf slash commands earn their surface cost again.

## Alternatives Considered

1. Keep leaf MCP prompts but hide them from agent install only (two truths; rejected)
1. Alias leaf slash names to the hub (ADR 115: no aliases on removed names)
1. Collapse tools too (rejected: user kept tools and skills)
