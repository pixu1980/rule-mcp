# 116: Fold check slash siblings into the parent via keyword intent

- **Date**: 2026-09-22
- **Status**: accepted
- **Tags**: commands, guardrails, breaking, check
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

ADR 106 added one `/rule-mcp-area-*-check` sibling per area prompt plus a general `/rule-mcp-check`. That doubled the area slash surface (~90 idle files) for a mode the parent already expressed in prose (`/rule-mcp-area-styleguide check this HTML`). ADR 115 kept the three check forms (`rule_tool_check`, `/rule-mcp-check`, `/rule-mcp-area-*-check`). The area siblings are noise: agents pick the parent and type "check" / "controlla" in the argument. The dedicated `/rule-mcp-check` remains useful as an explicit auto-detecting workflow.

## Decision

1. Delete every agent slash `/rule-mcp-area-*-check` sibling. No aliases.
2. Keep `/rule-mcp-check` as the general auto-detecting check workflow, and keep `rule_tool_check` as the check engine.
3. Fold area check mode into every `/rule-mcp-area-*` body (and optionally `/rule-mcp`): when `$ARGUMENTS` contain a check-intent keyword as a whole token (case-insensitive), run the guardrail-only path instead of the normal route/implement path.
4. Canonical keyword set (EN + IT): `check`, `checks`, `checking`, `controlla`, `controllare`, `controllo`, `controlli`, `validate`, `validates`, `validating`, `validation`, `valida`, `validare`, `validazione`, `verify`, `verifies`, `verifying`, `verification`, `verifica`, `verificare`, `guardrail`, `guardrails`, `lint`, `linting`. Export from one module so bodies, tests, and docs stay aligned.
5. Area parent binds the skill already owned by that command; `/rule-mcp-check` (and check intent on `/rule-mcp`) auto-detects skill from paths, diff, and chat context.
6. Supersedes ADR 106's per-area check siblings and ADR 115's `+[-check]` keep-item. Tool triple stays `rule_tool_<x>` ↔ `/rule-mcp-area-<x>` ↔ skill `rule-mcp-<x>`. Check forms: `rule_tool_check`, `/rule-mcp-check`, keyword intent on `/rule-mcp-area-*`.

## Consequences

Agent slash count drops by one per area prompt (~89). Installers purge stale `rule-mcp-area-*-check.*` on sync. Callers of `/rule-mcp-area-*-check` switch to the parent with a keyword, or use `/rule-mcp-check`. False positives on words like `checkbox` are avoided by whole-token matching.

## What would end this

Evidence that keyword intent misses real check asks too often, or that hosts need a dedicated per-area slash because `$ARGUMENTS` never reach the body.

## Alternatives Considered

1. Also delete `/rule-mcp-check` and rely only on keyword intent on `/rule-mcp` (rejected: keep the explicit workflow)
1. Subcommand syntax `/rule-mcp-area-frontend --check` (hosts do not parse flags out of slash args uniformly)
1. Aliases that rewrite `*-check` to the parent (ADR 115: no aliases on removed names)
