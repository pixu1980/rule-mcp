# rule-mcp

**Deterministic skills for every AI coding agent, without calling an LLM.**

rule-mcp is an MCP server. It sends a free-text request to the correct skill. It serves styleguides and templates as tools and resources. It checks generated code with guardrails. It runs on your machine and works with any model.

- **Node 24+**
- **82 skills**
- **105 tools**
- **172 resources**
- **41 prompts**
- **44 slash commands**

[Documentation site](https://pixu1980.github.io/rule-mcp/) [Get started](docs/01-getting-started.md) [Browse reference](docs/README.md)

## How it works

1. **Route.** The router reads a free-text request and selects a skill or an area hub.
2. **Serve.** The skill gives its evidence as MCP tools, resources, and prompts.
3. **Validate.** Deterministic guardrails check the generated code before you keep it.

## Start here

### [Getting started](docs/01-getting-started.md)

Install the server and connect your agent.

### [Reference](docs/README.md)

Read about the architecture, the guardrails, the CLI, and the environment variables.

### [Surface map](docs/21-surface-map.md)

Find every command, tool, and skill in one generated table.

## Project

The workspace root is `rule-mcp-workspace` and it is private. There is no npm package. The documentation site comes from these Markdown files and is published with GitHub Pages at <https://pixu1980.github.io/rule-mcp/>. The server has no LLM dependency.

[MIT](LICENSE) - [Contributing](CONTRIBUTING.md) - [Governance](GOVERNANCE.md) - [Code of Conduct](CODE_OF_CONDUCT.md) - [Maintainers](MAINTAINERS.md) - [Security](SECURITY.md)

## What the server does

rule-mcp is one MCP server that runs on your machine and serves deterministic skills to any coding agent. It reads a free-text request, routes it to the right skill, and returns that skill's evidence as tools, resources and prompts. Guardrails then check the generated code against the rules the skill states. No model is called to route, to serve or to validate, so the same request returns the same answer at no token cost. What the server records stays in one directory on the machine, with an off switch, and it sends the prompt nowhere else.
