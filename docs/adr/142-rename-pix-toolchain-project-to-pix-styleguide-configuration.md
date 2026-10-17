# 142: Rename rule-toolchain-project to rule-styleguide-configuration

- **Date**: 2026-10-17
- **Status**: accepted
- **Tags**: skills, styleguide, toolchain, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The skill held the base repository configuration: .gitignore, .editorconfig, .nvmrc, .env.example, README, LICENSE and CONTRIBUTING. It lived under the toolchain area, which owns build tools, linters and package managers, while the content is the written baseline a project follows. The styleguide area already links the skill from its index, so the name was the only thing placing it in the wrong area.

## Decision

Rename the directory and the skill to rule-styleguide-configuration, change the generated tool to rule_tool_styleguide_configuration, move its row from the toolchain tables into the styleguide tables in rule and rule-styleguide, update every cross-reference and the devx persona evidence skill, and regenerate the census. The skill content stays as it is; the duplicated tsconfig and lint configuration sections are a separate cleanup.

## Consequences

The catalog stays at 88 skills while the area counts move: toolchain loses one and styleguide gains one. Clients that call rule_tool_toolchain_project break and must call rule_tool_styleguide_configuration instead. The skill now sits beside the other styleguide children, and its duplicated compiler and lint configuration needs the follow-up cleanup the plan records.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the skill in the toolchain area and change only its title
1. Split the repository configuration into a new styleguide skill and leave the toolchain one
1. Fold the file templates into rule-styleguide as one long guide
