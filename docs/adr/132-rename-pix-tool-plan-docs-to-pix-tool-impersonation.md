# 132: Rename rule_tool_plan_docs to rule_tool_impersonation

- **Date**: 2026-10-01
- **Status**: accepted
- **Tags**: tools, personas, naming, breaking
- **Author**: Emiliano Pisu <emiliano.pisu@pixu1980.com>

## Context

`rule_tool_plan_docs` was the bookkeeping half of a persona run: write the
audit/review/plan trio after `rule_tool_plan` handed the agent the operation.
The name described the files, not the act. Callers already treat the tool as
"impersonate this role and keep its documents".

## Decision

Rename the tool to `rule_tool_impersonation`. The module moves to
`src/tools/actions/_impersonation.js`. Persona command bodies, the operation
contract, install instruction text and the surface map follow the new name.
Historical ADRs keep the old name as the decision they recorded.

## Consequences

`DEPRECATIONS` keeps `rule_tool_plan_docs` answering as `rule_tool_impersonation`
until 0.3.0, with one stderr warning on first use. After that the old name is
gone. The census regenerates `docs/09-tools.md` and `docs/16-surface-map.md`.

## What would end this

Nothing short of a further rename; the previous name is retired.
