# 106: Check runs per area, and the general check auto-detects it

- **Date**: 2026-09-18
- **Status**: superseded (area siblings; `/pix-check` kept by ADR 116)
- **Tags**: commands, prompts, guardrails
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>
- **Superseded by**: [116](116-fold-check-slash-siblings-into-parent-via-keyword-intent.md) (folds `/pix-area-*-check` into parents; keeps `/pix-check`)

## Context

The MCP prompt registry carried `/pix-process-check` (validate code against the pix guardrails) and `/pix-adr` (record a decision), while the agent command surface already had a `/pix-check`. The two check names spoke for the same work, the ADR prompt duplicated the pix-process-adr skill, and a single generic check gave no way to ask for one area's guardrails.

## Decision

Remove `/pix-adr` and `/pix-process-check` from the MCP prompt registry. Give the agent command surface one check command per area prompt, `/pix-area-<area>-check` (91 commands), each validating against that area's skill guardrails, plus a general `/pix-check` that auto-detects the area from the git diff, the chat context, or the codebase. `commandDefinition` resolves the `-check` suffix to its area prompt; `commandNames` appends the derived names and sorts them with the rest.

## Consequences

MCP prompts fall 155 to 153; reusable prompts 98 to 96. Agent slash commands rise 156 to 246, since one command per area now has a check sibling. A check is reachable both per area and generically, and the two-name collision around `pix-check` is gone. The persona and session families are untouched. ADR 113 later hard-deletes any leftover `pix-adr` / `pix-process-check` task-prompt cases and documents `/pix-area-process-adr` / `/pix-area-process-check` as the only ADR/check entry points beside `/pix-check`.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep `/pix-process-check` as the only MCP check prompt
1. Add `/pix-check` as an MCP prompt instead of an agent command
1. Give each area a check prompt rather than an agent command
