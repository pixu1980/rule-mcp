# 106: Check runs per area, and the general check auto-detects it

- **Date**: 2026-09-18
- **Status**: superseded (area siblings; `/rule-check` kept by ADR 116)
- **Tags**: commands, prompts, guardrails
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>
- **Superseded by**: [116](116-fold-check-slash-siblings-into-parent-via-keyword-intent.md) (folds `/rule-area-*-check` into parents; keeps `/rule-check`)

## Context

The MCP prompt registry carried `/rule-mcp-process-check` (validate code against the rule-mcp guardrails) and `/rule-mcp-adr` (record a decision), while the agent command surface already had a `/rule-check`. The two check names spoke for the same work, the ADR prompt duplicated the rule-mcp-process-adr skill, and a single generic check gave no way to ask for one area's guardrails.

## Decision

Remove `/rule-mcp-adr` and `/rule-mcp-process-check` from the MCP prompt registry. Give the agent command surface one check command per area prompt, `/rule-area-<area>-check` (91 commands), each validating against that area's skill guardrails, plus a general `/rule-check` that auto-detects the area from the git diff, the chat context, or the codebase. `commandDefinition` resolves the `-check` suffix to its area prompt; `commandNames` appends the derived names and sorts them with the rest.

## Consequences

MCP prompts fall 155 to 153; reusable prompts 98 to 96. Agent slash commands rise 156 to 246, since one command per area now has a check sibling. A check is reachable both per area and generically, and the two-name collision around `rule-check` is gone. The persona and session families are untouched. ADR 113 later hard-deletes any leftover `rule-mcp-adr` / `rule-mcp-process-check` task-prompt cases and documents `/rule-area-process-adr` / `/rule-area-process-check` as the only ADR/check entry points beside `/rule-check`.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep `/rule-mcp-process-check` as the only MCP check prompt
1. Add `/rule-check` as an MCP prompt instead of an agent command
1. Give each area a check prompt rather than an agent command
