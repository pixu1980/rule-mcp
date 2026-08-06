<!-- rule-mcp -->

Before writing any frontend/styling code, call `rule` to route the task to the correct rule skill. Follow rule AI principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via adoptedStyleSheets. Available tools: rule, pix_component, pix_check, pix_search, pix_scaffold, pix_process_adr.

> Skills source of truth: `./skills/` (served via rule MCP tools). No skills in `.agents/skills/`.

<!-- /rule-mcp -->

<!-- rule-mcp-commit-rules -->

## MANDATORY: commit scope

Every commit MUST use conventional commits **with a scope**: `type(scope): subject` (e.g. `feat(skills): ...`, `chore(config): ...`, `docs(project): ...`).

Commits without a scope (e.g. `docs: ...`) are rejected by the `commit-msg` hook (`.githooks/commit-msg`). Generated merge/revert messages are exempt.
<!-- /rule-mcp-commit-rules -->
