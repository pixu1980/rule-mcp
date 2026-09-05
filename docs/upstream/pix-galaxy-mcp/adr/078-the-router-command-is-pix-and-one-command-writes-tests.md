# 078: The router command is /rule and one command writes tests

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: commands, prompts, naming, installer
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

ADR 029 pinned a router command named rule-mcp first in every agent's command list. The name repeats the server's, and it is the command typed most often and the one every other rule points at: the session directive, the skills and the generated bodies all say "call rule". Two names for one thing, and the longer one on the surface where length costs keystrokes. Separately the command set carried both rule-tdd and rule-write-tests. rule-tdd was generated from the generic area template, so its body read "you are the tdd area specialist" with the baseline line "involve TDD (write failing tests first)" - circular, and its only named tool was pix_test_driven_development, which has never existed. rule-write-tests was hand-written and already covered failing unit tests, Playwright plus axe-core specs and devops test setup. Auditing that overlap also found pix_find_skills named in the skills area prompt: a second tool that has never existed. The prompts were inventing APIs, which is what their own reminder forbids on every call.

## Decision

The router command is /rule, and it is the only name: the old file is pruned on the next install or agent-commands run rather than kept as an alias, so there is one name to learn and none to keep in sync. The prune step had to learn about it, since the router is the one command with no hyphen after rule and the prefix test would otherwise leave it behind on --remove. The test commands collapse to one: rule-tdd keeps the name and takes the hand-written body and the scope argument that rule-write-tests had, so the command that says test-first is the one that actually writes the tests, and the generic area entry for tdd is gone. Test-first discipline is not lost with it - the session directive and every area prompt's baseline line already carry it. Both invented tool names are fixed: the test prompt names pix_devops_testing, and the skills prompt names pix_search and the `rule-mcp skills list|install` CLI, which is what actually exists. test/prompts.test.mjs now checks every prompt body against the tool registry, so a prompt can only name tools this server registers. Commands go from 35 to 34. The server keeps its own name everywhere it belongs: the npm package, the CLI binary, the MCP server id in mcp.json, and the RULE_MCP_* variables.

## Consequences

Anyone with muscle memory for /rule-mcp or /rule-write-tests loses it, and existing installs keep the stale files until they re-run the installer or `rule-mcp agent-commands`, at which point prune removes them; uninstall carries both old names in its legacy list so a machine that installed either version still cleans up. Six committed assertions moved because they encoded the router's filename across the Pi, Claude, Gemini, Cursor, Windsurf, Cline, VS Code and Devin surfaces, which is the cost of a name appearing in eight installers. One of those assertions got stronger rather than renamed: the router file now has to name the rule MCP tool instead of merely containing the server's name, which is what it was trying to check. The invented-tool gate is a new floor on the prompt registry and will fail any prompt that names a tool before it is registered, including a tool somebody intends to add in the same change. This ADR updates 029, which stands except for the router's name.

## Alternatives Considered

1. Keep /rule-mcp as an alias: two files rendering the same body, a command list of 36, and both names in every document that mentions either
1. Keep it deprecated for a release: a deprecation needs somebody to remove it later, and a command nobody removes is an alias with extra words
1. Keep both test commands with sharper descriptions: the split was never real - one was a generic template around a tool that did not exist
1. Keep rule-write-tests and drop the tdd name: it would have meant explaining which of two names to type for the same job, and tdd is the shorter and the one the directive already uses
