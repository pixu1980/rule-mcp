# Reference

This handbook tells how RuleMCP works and how to use it. The text comes from the source code and the tests.

## Use the server

1. [Getting started](./01-getting-started.md): install the server and connect an agent
2. [Architecture](./02-architecture.md): the path of a request
3. [Agent instructions](./03-agent-instructions.md): the rules that an agent receives
4. [Install and uninstall](./04-install.md): what the installer writes and removes
5. [Features and attribution](./05-features.md): the user-facing switches
6. [Integration levels](./06-integration-levels.md): how deep a host can go
7. [Custom skills](./07-custom-skills.md): add your own rules
8. [Release](./08-release.md): publish a version and the documentation site
9. [Troubleshooting](./09-troubleshooting.md): find and fix problems
10. [Environment variables](./10-env-variables.md): the `RULE_MCP_*` settings
11. [Privacy](./11-privacy.md): what the server records and how to erase it
12. [Engineering guides](./12-engineering-guides.md): how to work on this repository

## Generated inventories

The census writes these pages from the live registries. Do not edit them.

- [Skills](./13-skills.md): the catalog by area
- [Tools](./14-tools.md): each action tool with its parameters
- [Prompts](./15-prompts.md): each prompt that the server serves
- [Instructions](./16-instructions.md): the slash commands and the hooks
- [CLI](./17-cli.md): each command, flag, and default
- [Personas](./18-personas.md): the review roles and their lenses
- [Guardrails](./19-guardrails.md): the rules that a check runs
- [Resources](./20-resources.md): the `rule://` surface
- [Surface map](./21-surface-map.md): the counts, then each command, tool, and skill
- [Install targets](./22-install-targets.md): each agent and its integration ceiling
- [Environment readers](./23-env-readers.md): where the code reads each variable

The site shows pages 3 and 16 as one Instructions page.
