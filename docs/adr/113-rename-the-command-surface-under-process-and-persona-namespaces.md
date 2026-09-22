# 113: Rename the command surface under process and persona namespaces

- **Date**: 2026-09-22
- **Status**: accepted
- **Tags**: commands, prompts, personas, compression, breaking, release
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The slash-command surface still mixed namespaces: flight lived as a top-level one-shot (`/pix-flight`), ADR and process-check one-shots duplicated area skills that ADR 106 already preferred, compression was its own area (`pix-compression` / `/pix-area-compression*`) instead of a process skill, and persona commands used `pix-{plan|audit|review}-<role>` rather than a shared `persona` prefix. Install local copies and docs drifted. The release target for this break is `0.2.0-rc` (not 1.0.0).

## Decision

Breaking rename of the public command/skill/tool surface:

1. Flight leaves the slash/prompt surface: conceptual id `pix-area-process-flight`, injected on every prompt via the session directive (ADR 114). `/pix-flight` and `/pix-process-flight` are hard-deleted.
2. Hard-delete `/pix-adr` and `/pix-process-check`; callers use `/pix-area-process-adr` and `/pix-area-process-check`. `/pix-check` remains the auto-detecting agent command.
3. Rename skill `pix-compression` → `pix-process-compression` (inherits `pix-process`). Area commands become `/pix-area-process-compression[-check]`. Skill tool becomes `pix_tool_process_compression`. `pix_tool_compress` (pure text) is unchanged.
4. Persona commands become `pix-persona-<role>-<operation>` (operation last). Shared helpers `personaCommandName` / `parsePersonaCommand` drive registry, MCP getPrompt, agent commands, and skills-install. Legacy `pix-{op}-{role}` persona skill dirs are purged on regenerate.
5. `/pix-handoff`, `/pix-handon`, and `/pix-check` stay as named.
6. No compatibility aliases. Package version bumps to `0.2.0-rc`.

## Note

Superseded in part by ADR 115: flight moved to directive injection (ADR 114); process-compression and process-handoff skills/areas were removed in favour of `pix_tool_compress`/`/pix-compress` and `pix_tool_handoff`/`/pix-handoff`.

## Consequences

Every future install writes the new names only. Stale agent command files and `~/.agents/skills` persona dirs must be purged and reinstalled. Callers of `pix_tool_compression` or the old slash names break until they migrate. Census, README, and persona docs follow the new names. Historical ADRs that prescribed the old names are rewritten to match this decision.

## What would end this

A need for short aliases (`/pix-audit-security`) that outweighs a single discoverable namespace would revive shims; until then the hard delete stands. Flight injection policy lives in ADR 114.

## Alternatives Considered

1. Keep old names and add the new ones beside them (surface doubles; drift returns)
1. Jump to 1.0.0 for the break (rejected: release line stays pre-1.0 at `0.2.0-rc`)
1. Rename only agent commands, leave MCP prompt registry (two truths)
