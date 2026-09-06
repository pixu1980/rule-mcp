# rule-mcp documentation

This directory is a small handbook. Numbered documents below are the source of truth;
the [ADR index](./adr/ADR.md) records every architectural decision. Content that once
lived in separate files was consolidated into the numbered documents.

## Handbook

| File                                                              | Purpose                                                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| File                                                              | Purpose                                                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| File                                                              | Purpose                                                                                                                   |
| ----------------------------------------------------------------- | -----------------------------------------------------------------------------------------------                           |
| [./01-product-architecture.md](./01-product-architecture.md)      | Project mission and architecture, with the generated tool-family counts.                                                  |
| [./02-tools-operations.md](./02-tools-operations.md)              | Operator handbook: setup, agent installation, daemon, transports, troubleshooting.                                        |
| [./03-engineering-guides.md](./03-engineering-guides.md)          | Engineering guides: the loop, guardrails, docs pipeline, measured numbers, contributing.                                  |
| [./04-agent-instructions.md](./04-agent-instructions.md)          | Agent workflow, frontend principles, strict mode (manual prose; the generated command surface lives in 10).               |
| [./05-env-variables.md](./05-env-variables.md)                    | `RULE_MCP_*` environment variable reference, incl. the generated registry.                                                     |
| [./06-privacy.md](./06-privacy.md)                                | Privacy: what is recorded, where it lives, how to erase it.                                                               |
| [./07-skills.md](./07-skills.md)                                  | Generated: every skill (96) with its description and tool.                                                                |
| [./08-tools.md](./08-tools.md)                                    | Generated: every MCP tool (112), all LLM-free, grouped per family.                                                        |
| [./09-prompts.md](./09-prompts.md)                                | Generated: every MCP prompt (73), by category.                                                                            |
| [./10-instructions.md](./10-instructions.md)                      | Generated: the agent command surface (74 `/rule-*` commands) and install targets.                                          |
| [./11-cli.md](./11-cli.md)                                        | Generated: full CLI reference - commands, arguments, options, defaults.                                                   |
| [./12-personas.md](./12-personas.md)                              | Generated: the persona catalog (18 active), lenses, evidence and aliases.                                                 |
| [./GETTING_STARTED.md](./GETTING_STARTED.md)                      | First-run guide: install, configure, and try the server.                                                                  |

## Architecture decisions

- [ADR index](./adr/ADR.md) - every decision, newest first, with supersession notes

## Maintenance rules

- Add new long-form docs to one of the numbered handbook files unless a separate file is justified.
- Keep ADRs in `docs/adr/` because they are immutable decision records.
- When a plan is fully implemented, delete the plan file - no stale docs.
