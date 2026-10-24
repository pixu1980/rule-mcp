# 146: Remove the rule-mcp-styleguide-patterns cheat sheet

- **Date**: 2026-10-18
- **Status**: accepted
- **Tags**: skills, styleguide, duplication, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The skill was a 211-line cheat sheet that copied content from six owners: rule-mcp-styleguide-naming, rule-mcp-styleguide-file-tree, rule-mcp-styleguide-html, rule-mcp-styleguide-css, rule-mcp-styleguide-javascript and rule-mcp-styleguide-a11y, plus the unicorn idioms owned by rule-mcp-toolchain-eslint. Every section existed elsewhere, the internal title was the rule-mcp-styleguide name rather than its own, and it had no guardrails. It was the clearest duplication in the styleguide area.

## Decision

Delete the skill. Replace its references with the owner set: the architect and simplicity personas carry the six styleguide owners in their evidence skills, rule-mcp-process-simplicity points at the file tree and naming skills, and the router rows go away. Remove the tool, the framework-map entry, the content-test block and the flex-first carrier entry, then regenerate the census. The catalog drops to 87 skills, the tool surface to 108 and the resources to 182.

## Consequences

Clients that call rule_tool_styleguide_patterns break. The snippets the content test asserted are already covered by rule-mcp-styleguide-javascript, so no rule is lost. The two historical ADRs that mention the cheat sheet keep their text, because the repository treats ADRs as immutable; the new record is the place that says the skill is gone.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep it as a generated quick reference rebuilt from the owners
1. Keep it as a curated index of links with no copied rules
1. Fold it into the rule-mcp-styleguide router
