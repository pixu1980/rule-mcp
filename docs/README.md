# rule-mcp documentation

An MCP server that serves the rule skill catalog as tools, routes a prompt to the
right one, and validates code against guardrails without ever calling a model.

## Handbook

The numbers are a route through the product: install it, understand it, use it,
operate it, configure it, trust it, contribute to it. Everything from 08 on is
reference, generated from the running server.

| Document                                                     | Covers                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [./01-getting-started.md](./01-getting-started.md)           | Install it and make the first call                                             |
| [./02-product-architecture.md](./02-product-architecture.md) | How the server is built: modules, routing, caching, transports, security model |
| [./03-agent-instructions.md](./03-agent-instructions.md)     | How an agent uses it every day: workflow, frontend principles, session resume  |
| [./04-operations.md](./04-operations.md)                     | Operate it: plugins, release, troubleshooting                                  |
| [./05-env-variables.md](./05-env-variables.md)               | Configure it: every `RULE_MCP_*` variable, its default and its effect    |
| [./06-privacy.md](./06-privacy.md)                           | Trust it: what is recorded, where it lives, how to erase it                    |
| [./07-engineering-guides.md](./07-engineering-guides.md)     | Contribute to it: worked examples, measured numbers, contributor guidance      |
| [./08-skills.md](./08-skills.md)                             | Generated: the skill catalog by area, each with its tool and description       |
| [./09-tools.md](./09-tools.md)                               | Generated: every action tool with its parameters, and the skill tools by area  |
| [./10-prompts.md](./10-prompts.md)                           | Generated: every MCP prompt, reusable and persona                              |
| [./11-instructions.md](./11-instructions.md)                 | Generated: the agent slash commands, their install targets, and the hooks      |
| [./12-cli.md](./12-cli.md)                                   | Generated: every command, its arguments, its options and its defaults          |
| [./13-personas.md](./13-personas.md)                         | Generated: the review personas, their lenses, evidence skills and aliases      |
| [./14-guardrails.md](./14-guardrails.md)                     | Generated: every guardrail rule, with what it rejects, by family               |
| [./15-resources.md](./15-resources.md)                       | Generated: the MCP resource surface                                            |

## Architecture decisions

[./adr/ADR.md](./adr/ADR.md) is every decision this project has taken: a
chronological index, what each one says, and the themes they group into.
Generated from the numbered files beside it, so it cannot fall behind them.

**The ADR log is the only place history belongs.** Everything else in `docs/`
describes what is true now.

## Maintenance rules

- Add long-form documentation to one of the numbered handbook files unless a
  separate file is justified.
- **`08` through `15` are generated.** `pnpm census` derives them from the
  registries, and refreshes the fenced blocks inside `02`, `05` and `07`.
  Editing one by hand is work the next commit throws away;
  `tests/docs/census-generated.test.mjs` fails when a committed copy and the
  registry disagree.
- **No counts in this table.** A number written beside a link is a claim with no
  generator behind it, and it is the copy that goes stale (ADR 048). The counts
  live in the generated documents that derive them.
- **Write what the code does, never what it did.** A document that explains a
  change instead of a behavior is a second copy of an ADR, and it is the copy
  that goes stale.
- Keep ADRs in `docs/adr/`. They are immutable decision records, and the one
  exception to the rule above.
- When a plan is fully implemented, delete the plan file - no stale docs.
