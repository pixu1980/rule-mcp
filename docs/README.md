# rule-mcp documentation

This directory is intentionally consolidated into a small handbook. Historical files were merged into the numbered documents below with source markers and SHA-256 hashes so all content remains recoverable.

## Handbook

| File | Purpose |
|------|---------|
| [./01-product-architecture.md](./01-product-architecture.md) | Project mission, architecture, migration notes, and roadmap. This file consolidates the previous analysis/architecture/roadmap docs without dropping source content. |
| [./02-tools-operations.md](./02-tools-operations.md) | MCP tools, plugins, release process, setup, and troubleshooting. This file is the operator handbook. |
| [./03-engineering-guides.md](./03-engineering-guides.md) | Examples, benchmarks, agent instructions, and styleguide comparison notes for contributors. |
| [./04-roadmap-plans.md](./04-roadmap-plans.md) | Execution plans and refactor roadmap consolidated into one dependency-aware planning file. |

## Architecture decisions

- [ADR index](./adr/README.md) — 17 decisions numbered by logical dependency
- [Decision summary](./adr/DECISIONS.md)

## Maintenance rules

- Add new long-form docs to one of the numbered handbook files unless a separate file is justified.
- Keep ADRs in `docs/adr/` because they are immutable decision records.
- When a plan is fully implemented, delete the plan file — no stale docs.
