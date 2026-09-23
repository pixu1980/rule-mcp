# Reference

Public reference for rule-mcp: how the server is shaped, what it exposes,
and how to configure it.

## Contents

1. [Overview](./README.md): this page
2. [Architecture](./02-architecture.md): the request path, end to end
3. [Surface map](./16-surface-map.md): every command, tool, and skill in one table
4. [Instructions](./11-instructions.md): the commands, the hooks, and how an agent works with them
5. [Prompts](./10-prompts.md): every prompt the server serves
6. [Guardrails](./14-guardrails.md): the rules code is checked against
7. [Personas](./13-personas.md): review roles, their lenses, and their operations
8. [Resources](./15-resources.md): the `rule://` surface
9. [CLI](./12-cli.md): commands, flags, and defaults
10. [Env vars](./05-env-variables.md): the `RULE_MCP_*` configuration

The Instructions page draws on two documents: the hand-written agent workflow
(`03-agent-instructions.md`) and the generated command and hook inventory
(`11-instructions.md`). One page answers both what an agent is told and what the
installer writes for it.

## Catalogs behind the summaries

- [Skills](./08-skills.md): the catalog by area, each with its tool and description
- [Tools](./09-tools.md): every action tool with its parameters, and the skill tools by area

## Running and contributing

- [Getting Started](./01-getting-started.md): install it, and wire an agent
- [Operations](./04-operations.md): released modes, daemon and service, troubleshooting
- [Privacy](./06-privacy.md): what is recorded, where it lives, and how to erase it
- [Engineering guides](./07-engineering-guides.md): worked examples, measured numbers, contributor guidance
