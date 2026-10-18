# 145: Move the README skill from styleguide to process

- **Date**: 2026-10-18
- **Status**: accepted
- **Tags**: skills, process, styleguide, documentation, oss
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The skill owns the structure of a project README: the opening block, the facts, the example, getting started, and the required sections of an internal repository. It sat in the styleguide area, whose subject is the rules code is written to. Writing a README is a delivery step with an artifact and a review checklist, and the process area already owns the artifacts around it: the ADR, the changelog and the npm release. The Open Source Steward persona reads it as the first contact a project has with a user.

## Decision

Rename rule-styleguide-readme to rule-process-readme, change the tool to rule_tool_process_readme, move its row from the styleguide tables into the process tables in rule and rule-process, update the docs persona, add the skill to the Open Source Steward evidence skills with a lens about the README as the first contact, and regenerate the census.

## Consequences

The catalog stays at 88 skills while the area counts move: styleguide loses one and process gains one. Clients that call rule_tool_styleguide_readme break and must call rule_tool_process_readme instead. The Open Source Steward now carries the README in its evidence, and the README's boundaries stay explicit: markdown owns the syntax, configuration owns the presence of the file.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the skill in the styleguide area beside the markdown conventions
1. Move it to the platform area as part of library authoring
1. Split the open source structure from the internal repository structure
