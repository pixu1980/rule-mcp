# Agent Instructions for pix-galaxy-mcp

Use the pix-galaxy-mcp workflow for every coding task.

## Recommended workflow

1. Call `pix_tool` or `pix_tool_gateway` with full request plus known framework/project path.
2. `pix_tool_gateway` routes, loads evidence, and checks guardrails in a single call.
3. Treat repository/tool evidence as source of truth. Never invent APIs, files, dependencies, tools, requirements, or successful checks.
4. If evidence missing, call `pix_tool_search`; if still absent, state uncertainty.
5. Write failing tests before implementation changes.
6. Use `pix_tool_component` for component templates, `pix_tool_scaffold` for project config files.
7. Run `pix_tool_check`. Failed guardrails are blocking; fix and rerun until all pass.
8. Run project tests/typecheck and report only commands actually executed.
9. Record structural decisions with `pix_tool_process_adr` (disabled by default, enable with `PIX_AUTO_ADR=1`).
10. Before writing files, run `pix_tool_gateway` to get a receipt; use `pix_tool_apply` with the receipt for writes.

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

Set `PIX_GALAXY_MCP_MINIMAL_TOOLS=1` (off by default) to expose only the 10 dispatcher/action tools:
`pix_tool`, `pix_tool_update`, `pix_tool_gateway`, `pix_tool_apply`, `pix_tool_search`, `pix_tool_check`, `pix_tool_scaffold`, `pix_tool_detect`, `pix_tool_process_handoff`, `pix_tool_component`.

## Reusable entry points

- Pi, Claude Code, Gemini CLI, Cursor: `/pix-galaxy-mcp <request>`.
- GitHub Copilot CLI: `/agent`, select `pix-galaxy-mcp`.
- Codex CLI: invoke globally installed `pix_tool` skill; exact custom prompt support varies by version.
