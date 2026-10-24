# 100: The TokenSave integration closes out: the adapter and its graph-backed tools are the code-graph layer

- **Date**: 2026-09-15
- **Status**: accepted
- **Tags**: tokensave, architecture, closeout, code-graph
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

docs/plans/tokensave-integration.md analyzed the TokenSave code-graph server (89 tools) against this repository's own surface (107 tools), produced a replacement map, and tracked nine milestones (M0 to M8) across the adapter, the read paths, routing, edits, dependencies and hardening. It shipped on 2026-09-15, from commit d4521b5 (M0, the adapter foundation) to commit f38b003 (M8, the version gate, staleness and parity), with every milestone stamped done in the plan.

## Decision

Fold the plan record into this ADR, name it in the session handoff, and delete the source file; the full text stays in git history. What landed is the code-graph layer: src/core/tokensave/ with probe, adapter and parity behind a barrel; the file-listing and read providers that replaced the file-tree scans; graph-backed candidates in routing; the edit adapter for write tools; the semantic-changes handoff section; the graph checklist in rule_tool_check mode=project; dependency, test and diagnostic reads; and the version gate with staleness and parity checks.

## Consequences

docs/plans/tokensave-integration.md is gone from the tree and the handoff of this session names what it carried. The five questions below stay undecided and are now this ADR's open list rather than the plan's section 9. ADR 096 remains the statement of the policy these milestones implement: TokenSave is the primary code graph and the JavaScript graph is the fallback.

## What would end this

The assumption is that the TokenSave MCP surface stays stable enough to be this repository's primary code graph, and that its index is present next to the source. Removing the tools the adapter binds to, or a major version the parity gate refuses, would make the JavaScript graph the primary one instead, which is what ADR 096 already names as the fallback.

## Alternatives Considered

1. Adapter transport: call TokenSave through the existing MCP gateway (cheaper, no process spawn) or shell out to `tokensave tool` (simpler to test). The recommendation recorded in the plan was MCP first with a CLI fallback.
1. Skills as docs: whether indexing skills/ as TokenSave docs pollutes the code graph. The queryignore mechanism exists; it was to be validated with `tokensave discover` before enabling.
1. Counter ownership: whether the server reads the TokenSave counter into rule_tool_stats, or keeps the two ledgers separate and reconciles with `tokensave gain`.
1. Version policy: which TokenSave major is the minimum supported version. It was 7.12.1 at the time of the plan.
1. Multi-root: graph_root accepts an array on search and files, so whether the adapter should query sibling projects (rule-mcp-architect, virtual-office) in one call.
