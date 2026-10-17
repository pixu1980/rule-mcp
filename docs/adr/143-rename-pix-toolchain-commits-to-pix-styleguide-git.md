# 143: Rename rule-toolchain-commits to rule-styleguide-git

- **Date**: 2026-10-17
- **Status**: accepted
- **Tags**: skills, styleguide, toolchain, git, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The skill owns the git commit rule: atomic Conventional Commits with a mandatory scope, branch naming, and the commit-msg and pre-push discipline. It lived under the toolchain area, which owns build tools, linters and package managers, while the content is a written convention the author follows. The husky skill needed to link it from the hook side, and the two read better as siblings in the styleguide area.

## Decision

Rename the directory and the skill to rule-styleguide-git, change the generated tool to rule_tool_styleguide_git, move its rows from the toolchain tables into the styleguide tables in rule and rule-styleguide, update every cross-reference and the deterministic git-domain boost in the skill ranker, and regenerate the census.

## Consequences

The catalog stays at 88 skills while the area counts move: toolchain loses one and styleguide gains one. Clients that call rule_tool_toolchain_commits break and must call rule_tool_styleguide_git instead. The ranker keeps routing git prompts to the skill by its new name, and the husky plan links it as a styleguide sibling.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the skill in the toolchain area and change only its title
1. Leave the commit rule in the husky skill and delete this one
1. Split the branch naming and the commit rule into two skills
