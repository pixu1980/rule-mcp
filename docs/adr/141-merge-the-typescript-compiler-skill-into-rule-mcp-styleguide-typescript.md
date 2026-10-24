# 141: Merge the TypeScript compiler skill into rule-styleguide-typescript

- **Date**: 2026-10-17
- **Status**: accepted
- **Tags**: skills, typescript, toolchain, styleguide, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Two skills covered TypeScript: rule-toolchain-typescript held the compiler configuration and rule-styleguide-typescript held the code rules, and each one opened by pointing at the other. The split made the router choose between two halves of one topic and duplicated the tsconfig guidance in the toolchain index. The name rule-styleguide-typescript already existed, so the toolchain skill could not be renamed to it without a merge.

## Decision

Remove rule-toolchain-typescript and move its content into skills/rule-styleguide-typescript/COMPILER.md, linked from SKILL.md as the compiler half of the same skill. The four guardrails stay in rule-styleguide-typescript. The tool rule_tool_toolchain_typescript is removed, the routing corpus sends tsconfig prompts to styleguide-typescript, the tool-surface snapshot drops the entry, and the census regenerates the skill, tool and resource counts. Handoffs and ADRs keep their historical mentions unchanged.

## Consequences

The catalog drops from 89 to 88 skills, the tool surface from 110 to 109 tools and the resources from 186 to 184. Clients that call rule_tool_toolchain_typescript break and must call rule_tool_styleguide_typescript instead. The compiler guidance is one click away in COMPILER.md instead of a separate routed skill, and the repo's content test reads both files.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Rename the skill to rule-styleguide-tsconfig and keep two TypeScript skills
1. Keep both skills and change only the label in the toolchain router
1. Move the compiler configuration into rule-toolchain-project
