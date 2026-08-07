# Agent Instructions for rule-mcp

Use the rule-mcp workflow for every coding task.

## Recommended workflow

1. Call `pix_tool` or `rule_tool_gateway` with full request plus known framework/project path.
2. `rule_tool_gateway` routes, loads evidence, and checks guardrails in a single call.
3. Treat repository/tool evidence as source of truth. Never invent APIs, files, dependencies, tools, requirements, or successful checks.
4. If evidence missing, call `rule_tool_search`; if still absent, state uncertainty.
5. Write failing tests before implementation changes.
6. Use `rule_tool_component` for component templates, `rule_tool_scaffold` for project config files.
7. Run `rule_tool_check`. Failed guardrails are blocking; fix and rerun until all pass.
8. Run project tests/typecheck and report only commands actually executed.
9. Record structural decisions with `rule_tool_process_adr` (disabled by default, enable with `RULE_MCP_AUTO_ADR=1`).
10. Before writing files, run `rule_tool_gateway` to get a receipt; use `rule_tool_apply` with the receipt for writes.

## Advisory boundaries

The server applies preprocessing (rejects malformed/unsafe input) and postprocessing (validates output shape).
These are **advisory** - they improve reliability but MCP protocol cannot enforce tool call ordering.
See `src/core/enforcement.js` for details.

## Frontend principles

- **Zero CSS classes** - element and `[data-part]`/`[data-*]` selectors only.
- **Zero inline styles** - external CSS or framework-native external loading.
- **Semantic HTML mandatory** - use semantic element instead of generic `<div>` where available.
- **Barrel pattern** - component folder has `index.js`; implementation files use `_PascalCase.ext`.
- **No unapproved CSS frameworks** - no Tailwind, Bootstrap, or CSS-in-JS.

## Minimal tool surface

Set `RULE_MCP_MINIMAL_TOOLS=1` (off by default) to expose only the 10 dispatcher/action tools:
`pix_tool`, `rule_tool_update`, `rule_tool_gateway`, `rule_tool_apply`, `rule_tool_search`, `rule_tool_check`, `rule_tool_scaffold`, `rule_tool_detect`, `rule_tool_process_handoff`, `rule_tool_component`.

## Reusable entry points

- Pi, Claude Code, Gemini CLI, Cursor: `/rule-mcp <request>`.
- GitHub Copilot CLI: `/agent`, select `rule-mcp`.
- Codex CLI: invoke globally installed `pix_tool` skill; exact custom prompt support varies by version.
