# Agent Instructions for pix-galaxy-mcp

Use enforced workflow for every coding task, not frontend only.

## Mandatory workflow

1. Call `pix` with full request plus known framework/project path.
2. Load routed primary `pix-*` skill and only necessary secondary skills.
3. Treat repository/tool evidence as source of truth. Never invent APIs, files, dependencies, tools, requirements, or successful checks.
4. If evidence missing, call `pix_search`; if still absent, state uncertainty.
5. Write failing tests before implementation changes.
6. Use deterministic tools such as `pix_component`, `pix_scaffold`, and `pix_fix` when applicable.
7. Run `pix_check`. Failed guardrails are blocking; fix and rerun until all pass.
8. Run project tests/typecheck and report only commands actually executed.
9. Record structural decisions with `pix_process_adr`.

## Server-enforced boundaries

- Preprocessing rejects malformed, unsafe, oversized, deeply nested, or blank routing requests before handlers execute.
- Postprocessing validates MCP output, verifies router skill/tool identifiers, and appends `_meta.pixEnforcement` plus visible compliance contract.
- Guardrails reject placeholder implementation, ignored diagnostics, empty catches, and undeclared imports when dependency context exists.

## Frontend principles

- **Zero CSS classes** — element and `[data-part]`/`[data-*]` selectors only.
- **Zero inline styles** — external CSS or framework-native external loading.
- **Semantic HTML mandatory** — use semantic element instead of generic `<div>` where available.
- **Barrel pattern** — component folder has `index.js`; implementation files use `_PascalCase.ext`.
- **No unapproved CSS frameworks** — no Tailwind, Bootstrap, or CSS-in-JS.

## Reusable entry points

- Pi, Claude Code, Gemini CLI, Cursor: `/pix-galaxy-mcp <request>`.
- GitHub Copilot CLI: `/agent`, select `pix-galaxy-mcp`.
- Codex CLI: invoke globally installed `pix` skill; exact custom prompt support varies by version.
