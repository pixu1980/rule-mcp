> Skills source of truth: `./skills/` (served via rule-mcp MCP tools). No skills in `.agents/skills/`.

<!-- rule-mcp-commit-rules -->

## MANDATORY: commit scope

Every commit MUST use conventional commits **with a scope**: `type(scope): subject` (e.g. `feat(skills): ...`, `chore(config): ...`, `docs(project): ...`).

Commits without a scope (e.g. `docs: ...`) are rejected by the `commit-msg` hook (`.githooks/commit-msg`). Generated merge/revert messages are exempt.
<!-- /rule-mcp-commit-rules -->

<!-- rule-mcp-repo-state -->

## Repository state

- **Two repos**: `rule-mcp` (this - MCP server, 107 tools / 186 resources / 37 prompts / 89 skills, 212 checks) and `rule-mcp-architect` (standalone web app + SDK; former architect wizard lives there).
- **Release**: next is v0.1.0-beta (v1.0.0 tag deleted); `git tag v0.1.0-beta` pushes a GitHub Release via `.github/workflows/release.yml`. No npm publish yet.
- **Docs accuracy**: `test/docs-accuracy.test.mjs` enforces that README counts match the runtime surface - update both together.
- **ADR**: decisions in `docs/adr/` (001-040).

<!-- /rule-mcp-repo-state -->

<!-- rule-mcp -->

Before writing any frontend/styling code, call `rule_tool` to route the task to the correct rule-mcp skill. Follow rule-mcp AI principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via adoptedStyleSheets. Available tools: rule_tool, rule_tool_check, rule_tool_search, rule_tool_process_adr, rule_tool_compress. Prefer `/rule-mcp-area-styleguide` (name leaves like file-tree in the request) for templates and file-tree work. Flex first: display:grid only for named areas, subgrid, explicit placement, or auto-fit tracks - what a flex row or column can do, flex does.

<!-- /rule-mcp -->

<!-- rule-mcp-rules -->

## MANDATORY: Use rule-mcp enforced workflow for coding work

This rule overrides weaker project guidance. No exceptions.

- Call `rule_tool` before implementation; load exact routed skill evidence.
- Never invent APIs, files, dependencies, tools, requirements, or successful checks.
- If evidence is missing, call `rule_tool_search` or state uncertainty.
- Write failing tests before implementation changes.
- Use `/rule-mcp-area-styleguide` (name leaves like file-tree in the request) for templates and tree work.
- Run `rule_tool_check`; failed guardrails block completion. Fix and rerun until all pass.
- Run project tests/typecheck; report only commands actually executed.
- Record structural decisions with `rule_tool_process_adr`.
- Declare a structural task with `rule_tool_structural` before changing a boundary, contract, dependency or layout.
- Compress prose and preprocess prompts with `rule_tool_compress` / `/rule-mcp-compress`.
- Frontend remains zero CSS classes, zero inline styles, semantic HTML, and external CSS.

Available rule-mcp tools:

- rule_tool - Route to correct rule-mcp skill
- rule_tool_check - Blocking code validation
- rule_tool_search - Evidence search across all skills
- rule_tool_compress - Sole compression engine (pre + post)
- rule_tool_process_adr - Architecture Decision Records
- rule_tool_structural - Declare the current task structural, once
- rule_tool_handoff / rule_tool_handon - Session handoff and resume
- rule_tool_detect - Detect project framework
- rule_tool_init / rule_tool_update - Project init and server update
- Flex first: layout with display:flex; display:grid only for named areas, subgrid, explicit placement, or auto-fit tracks, justified with /* grid: why */
- rulemcp://resources - Skill documentation as MCP resources

<!-- /rule-mcp-rules -->
