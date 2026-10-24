# 122: The fix tool and command apply the deterministic guardrails, not the file tree

- **Date**: 2026-09-23
- **Status**: accepted
- **Tags**: tools, commands, guardrails
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

rule_tool_fix existed in the code but was never registered: registerFixTool was called from nowhere, so `rule-mcp fix` and the doctor fix answered Unknown tool, and the tool was absent from the surface map. ADR 115 removed the scaffold, component and a11y-report tools but left fix, so its absence was an oversight, not a decision. The tool s old job was file-tree lint/fix: barrels, _PascalCase naming, generated component folders.

## Decision

1. rule_tool_fix is registered again, through registerActionTools, with a new job: apply the deterministic guardrail fixes every skill owns - blank lines, braces, single-line bodies, ASCII typography, American spelling - to the changed files or an explicit list, in lint (report) or fix (write) mode. 2. A /rule-fix command mirrors it, on the /rule-check pattern: fix deterministically, then call rule_tool_check for the findings that need judgment. 3. The passes live in core/guardrails/fix/, shared with scripts/fix so the tool, the script and the command cannot drift; the directory is a documented counterexample catalog because it quotes the patterns it fixes. 4. The file-tree lint/fix/generate modes are gone; file-tree drift is reported by rule_tool_check with rule-mcp-styleguide-file-tree, and its repairs are judgment calls.

## Consequences

The surface is 107 tools and 40 commands. The CLI fix command and the doctor fix work again. The split is explicit: the machine settles the mechanical findings, the model spends its turns on the ones that need judgment. Cost: the file-tree auto-fix (rename an unprefixed component, create a missing barrel) no longer exists as a tool; a run reads the check report and edits by hand.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Leave rule_tool_fix unregistered and delete the CLI fix and the doctor fix (rejected: the file-tree fix capability was intended, and its absence broke a documented command).
1. Keep the file-tree job and add a second tool for the guardrail fixes (rejected: two tools for one verb, and the file-tree job has no deterministic fixer left).
