# 144: Move the validation skill from styleguide to data

- **Date**: 2026-10-17
- **Status**: accepted
- **Tags**: skills, data, styleguide, validation, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The skill holds international business data rules: email, phone, VAT, tax IDs, postal codes, national identifiers, address and entity schemas, and the validation libraries that enforce them. It sat in the styleguide area, whose subject is the rules code is written to, per language and concern, but its content is data shape and country formats, not code style. The same values are validated in the client form, sent to the API and stored, so the data area is the umbrella that already covers where those values go.

## Decision

Rename rule-styleguide-validation to rule-data-validation, change the tool to rule_tool_data_validation, move its rows from the styleguide tables into the data tables in rule-mcp and rule-data, update the personas that name it, the framework map in the guardrail registry, the tool-surface snapshot and the census, and broaden the data area description to include the shape and validation of the data that reaches the database.

## Consequences

The catalog stays at 88 skills while the area counts move: styleguide loses one and data gains one. Clients that call rule_tool_styleguide_validation break and must call rule_tool_data_validation instead. The area description in the census data file now names validation, which is the one hand-written line the derived areas cannot produce.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the skill in the styleguide area as a cross-cutting concern
1. Create a new validation area with its own router
1. Move it to the backend area, where input validation at the boundary lives
