# Reference

Public reference for RuleMCP: how the server is shaped, what it exposes,
and how to configure it.

## Contents

1. [Quick start](./07-quick-start.md): the main flows in short examples
2. [Overview](./README.md): this page
3. [Architecture](./02-architecture.md): the request path, end to end
4. [Surface map](./17-surface-map.md): every command, tool, and skill in one table
5. [Instructions](./12-instructions.md): the commands, the hooks, and how an agent works with them
6. [Prompts](./11-prompts.md): every prompt the server serves
7. [Guardrails](./15-guardrails.md): the rules code is checked against
8. [Personas](./14-personas.md): review roles, their lenses, and their operations
9. [Resources](./16-resources.md): the `rulemcp://` surface
10. [CLI](./13-cli.md): commands, flags, and defaults
11. [Env vars](./05-env-variables.md): the `RULE_MCP_*` configuration

The Instructions page draws on two documents: the hand-written agent workflow
(`03-agent-instructions.md`) and the generated command and hook inventory
(`12-instructions.md`). One page answers both what an agent is told and what the
installer writes for it.

## Catalogs behind the summaries

- [Skills](./09-skills.md): the catalog by area, each with its tool and description
- [Tools](./10-tools.md): every action tool with its parameters, and the skill tools by area

## Running and contributing

- [Getting Started](./01-getting-started.md): install it, and wire an agent
- [Operations](./04-operations.md): released modes, daemon and service, troubleshooting
- [Privacy](./06-privacy.md): what is recorded, where it lives, and how to erase it
- [Engineering guides](./08-engineering-guides.md): worked examples, measured numbers, contributor guidance
- [Migration to RuleMCP](./migrations/rule-mcp-rename.md): upgrade from the pre-rename package
