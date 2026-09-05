# 055: Pre-packaged MCP prompt registry (26 prompts, strict schemas, commit-scope closer)

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: prompts, registry, tdd, a11y
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The prepackaged-mcp-prompts execution plan (2025-08-01 interview) set the prompt registry growth from 5 to 26 prompts: 5 one-shot workflows + 16 area prompts + 5 existing updated, all prompts renamed during the rule_tool_* tool rename so prompt names could never collide with tool names. All 10 checklist items are done; the plan file is now redundant.

## Decision

Adopt the 26-prompt pre-packaged registry in src/prompts/index.js with strict argument schemas, tool-invoked styleguides, TDD/a11y baseline, and a mandatory commit-scope closer; keep prompt names distinct from the rule_tool_* namespace.

## Consequences

Positive: one prompt per area with strict zod-validated arguments, styleguides invoked via tools, TDD/a11y baseline or explicit opt-out, every one-shot ends by proposing a commit message with mandatory scope. Negative: prompt surface must be re-verified whenever tools are renamed or added (docs-accuracy enforces the live counts).

## Alternatives Considered

1. Ship a handful of manually curated prompts maintained in prose
1. Auto-generate every prompt from tool schemas
