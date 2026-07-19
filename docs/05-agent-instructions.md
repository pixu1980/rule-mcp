# Agent Instructions for rule-mcp

Use the rule-mcp workflow for every coding task.

## Recommended workflow

1. Call `rule` or `pix_gateway` with full request plus known framework/project path.
2. `pix_gateway` routes, loads evidence, and checks guardrails in a single call.
3. Treat repository/tool evidence as source of truth. Never invent APIs, files, dependencies, tools, requirements, or successful checks.
4. If evidence missing, call `pix_search`; if still absent, state uncertainty.
5. Write failing tests before implementation changes.
6. Use `pix_component` for component templates, `pix_scaffold` for project config files.
7. Run `pix_check`. Failed guardrails are blocking; fix and rerun until all pass.
8. Run project tests/typecheck and report only commands actually executed.
9. Record structural decisions with `pix_process_adr` (disabled by default, enable with `RULE_MCP_AUTO_ADR=1`).
10. Before writing files, run `pix_gateway` to get a receipt; use `pix_apply` with the receipt for writes.
11. After `pix_apply` writes files, Prettier + blank-line fixer + block-spacing fixer run automatically as post-processing.

## Advisory boundaries

The server applies preprocessing (rejects malformed/unsafe input) and postprocessing (validates output shape).
These are **advisory** — they improve reliability but MCP protocol cannot enforce tool call ordering.
See `src/core/enforcement.js` for details.

## Frontend principles

- **Zero CSS classes** — element and `[data-part]`/`[data-*]` selectors only.
- **Zero inline styles** — external CSS or framework-native external loading.
- **Semantic HTML mandatory** — use semantic element instead of generic `<div>` where available.
- **Barrel pattern** — component folder has `index.js`; implementation files use `_PascalCase.ext`.
- **No unapproved CSS frameworks** — no Tailwind, Bootstrap, or CSS-in-JS.

## Reusable entry points

- Pi, Claude Code, Gemini CLI, Cursor: `/rule-mcp <request>`.
- GitHub Copilot CLI: `/agent`, select `rule-mcp`.
- Codex CLI: invoke globally installed `rule` skill; exact custom prompt support varies by version.

## Environment variables

See [06-env-variables.md](06-env-variables.md) for the complete reference table, persistence, and configuration.
