<!-- rule-mcp -->

Before writing any frontend/styling code, call `rule` to route the task to the correct rule skill. Follow rule AI principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via adoptedStyleSheets. Available tools: rule, pix_component, pix_check, pix_search, pix_scaffold, pix_process_adr.

> Skills source of truth: `./skills/` (served via rule MCP tools). No skills in `.agents/skills/`.

<!-- /rule-mcp -->

<!-- rule-mcp-commit-rules -->

## MANDATORY: commit scope

Every commit MUST use conventional commits **with a scope**: `type(scope): subject` (e.g. `feat(skills): ...`, `chore(config): ...`, `docs(project): ...`).

Commits without a scope (e.g. `docs: ...`) are rejected by the `commit-msg` hook (`.githooks/commit-msg`). Generated merge/revert messages are exempt.
<!-- /rule-mcp-commit-rules -->

<!-- rule-mcp-repo-state -->

## Repository state

- **Two repos**: `rule-mcp` (this - MCP server, 105 tools / 184 resources / 73 prompts / 89 skills, 212 checks) and `rule-mcp-architect` (standalone web app + SDK; former architect wizard lives there).
- **Release**: next is v0.1.0-beta (v1.0.0 tag deleted); `git tag v0.1.0-beta` pushes a GitHub Release via `.github/workflows/release.yml`. No npm publish yet.
- **Docs accuracy**: `test/docs-accuracy.test.mjs` enforces that README counts match the runtime surface - update both together.
- **ADR**: decisions in `docs/adr/` (001-040).

<!-- /rule-mcp-repo-state -->
