# rule-mcp documentation

This directory is a small handbook. Numbered documents below are the source of truth;
the [ADR index](./adr/ADR.md) records every architectural decision. Content that once
lived in separate files was consolidated into the numbered documents.

## Handbook

| File                                                         | Purpose                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [./01-product-architecture.md](./01-product-architecture.md) | Project mission, architecture, migration notes, and roadmap.                                           |
| [./02-tools-operations.md](./02-tools-operations.md)         | MCP tools, plugins, release process, setup, and troubleshooting. This file is the operator handbook.   |
| [./03-engineering-guides.md](./03-engineering-guides.md)     | Examples, benchmarks, agent instructions, and styleguide comparison notes for contributors.            |
| [./04-roadmap-plans.md](./04-roadmap-plans.md)               | Execution plans and refactor roadmap consolidated into one dependency-aware planning file.             |
| [./05-agent-instructions.md](./05-agent-instructions.md)     | Agent workflow, frontend principles, strict mode.                                                      |
| [./06-env-variables.md](./06-env-variables.md)               | Complete `RULE_MCP_*` environment variable reference with defaults and configuration.                       |
| [./07-census.md](./07-census.md)                             | Full census of MCP tools (307) and `/rule-*` slash commands (62), verified against the runtime surface. |

## Architecture decisions

- [ADR index](./adr/ADR.md) - every decision, newest first, with supersession notes

## Maintenance rules

- Add new long-form docs to one of the numbered handbook files unless a separate file is justified.
- Keep ADRs in `docs/adr/` because they are immutable decision records.
- When a plan is fully implemented, delete the plan file - no stale docs.
