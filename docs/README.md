# rule-mcp documentation

An MCP server that serves the rule skill catalog as tools, routes a prompt to the
right one, and validates code against guardrails without ever calling a model.

## Handbook

| Document                                                     | Covers                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [./01-product-architecture.md](./01-product-architecture.md) | How the server is built: modules, routing, caching, transports, security model    |
| [./02-tools-operations.md](./02-tools-operations.md)         | Operator handbook: setup, agent installation, daemon, transports, troubleshooting |
| [./03-engineering-guides.md](./03-engineering-guides.md)     | Worked examples, measured performance, contributor guidance                       |
| [./04-agent-instructions.md](./04-agent-instructions.md)     | Agent workflow, frontend principles, session resume                               |
| [./05-env-variables.md](./05-env-variables.md)               | Every `RULE_MCP_*` variable, its default and its effect                     |
| [./06-skills.md](./06-skills.md)                             | Generated: the skill catalog by area, each with its tool and description          |
| [./07-tools.md](./07-tools.md)                               | Generated: every action tool with its parameters, and the skill tools by area     |
| [./08-prompts.md](./08-prompts.md)                           | Generated: every MCP prompt, reusable and persona                                 |
| [./09-instructions.md](./09-instructions.md)                 | Generated: the agent slash commands, their install targets, and the hooks         |
| [./10-cli.md](./10-cli.md)                                   | Generated: every command, its arguments, its options and its defaults             |
| [./11-personas.md](./11-personas.md)                         | Generated: the review personas, their lenses, evidence skills and aliases         |
| [./12-guardrails.md](./12-guardrails.md)                     | Generated: every guardrail rule, with what it rejects, by family                  |
| [./13-resources.md](./13-resources.md)                       | Generated: the MCP resource surface                                               |

Unnumbered, because neither is a chapter of the handbook:
[./GETTING_STARTED.md](./GETTING_STARTED.md) is the first-run guide, and
[./privacy.md](./privacy.md) is what is recorded, where it lives and how to
erase it.

## Architecture decisions

[./adr/ADR.md](./adr/ADR.md) is every decision this project has taken: a
chronological index, what each one says, and the themes they group into.
Generated from the numbered files beside it, so it cannot fall behind them.

**The ADR log is the only place history belongs.** Everything else in `docs/`
describes what is true now.

## Maintenance rules

- Add long-form documentation to one of the numbered handbook files unless a
  separate file is justified.
- **`06` through `13` are generated.** `pnpm census` derives them from the
  registries, and refreshes the fenced blocks inside `01`, `03` and `05`.
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
