# Documentation

An MCP server that serves 91 rule skills as tools, routes a prompt to the
right one, and validates code against guardrails without ever calling a model.

## Handbook

| Document                                                     | Covers                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [./01-product-architecture.md](./01-product-architecture.md) | How the server is built: modules, routing, caching, transports, security model |
| [./02-tools-operations.md](./02-tools-operations.md)         | Every tool and CLI command, installation, releases, troubleshooting            |
| [./03-engineering-guides.md](./03-engineering-guides.md)     | Worked examples, measured performance, contributor guidance                    |
| [./05-agent-instructions.md](./05-agent-instructions.md)     | Agent workflow, slash commands, session resume                                 |
| [./06-env-variables.md](./06-env-variables.md)               | Every `RULE_MCP_*` variable, its default and its effect                         |

## Architecture decisions

[./adr/ADR.md](./adr/ADR.md) is every decision this project has taken:
a chronological index, what each one says, and the themes they group into.
Generated from the numbered files beside it by `pix_process_adr`, so it
cannot fall behind them.

**The ADR log is the only place history belongs.** Everything else in `docs/`
describes what is true now.

## Maintenance rules

- Add long-form documentation to one of the numbered handbook files unless a
  separate file is justified.
- **Write what the code does, never what it did.** A document that explains a
  change instead of a behavior is a second copy of an ADR, and it is the copy
  that goes stale. The same rule applies to comments and is enforced there by
  the `js-comment-no-history` guardrail.
- Keep ADRs in `docs/adr/`. They are immutable decision records, and one of the
  two exceptions to the rule above.
- `CHANGELOG.md` is the other, and it is generated: `scripts/build-changelog.mjs`
  derives it from the commits and the pre-commit hook stages it. Editing it by
  hand is work the next commit throws away.
- Reading material stays outside this repository. Only what was learned from it
  is committed, in our own words. `test/no-source-traces.test.mjs` enforces it.
- `test/docs-scan.mjs` fails the build on a link to something that does not
  exist.
