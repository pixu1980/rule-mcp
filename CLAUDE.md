> Skills source of truth: `./skills/` (served via pix MCP tools). No skills in `.agents/skills/`.

<!-- rule-mcp-commit-rules -->

## MANDATORY: commit scope

Every commit MUST use conventional commits **with a scope**: `type(scope): subject` (e.g. `feat(skills): ...`, `chore(config): ...`, `docs(project): ...`).

Commits without a scope (e.g. `docs: ...`) are rejected by the `commit-msg` hook (`.githooks/commit-msg`). Generated merge/revert messages are exempt.
<!-- /rule-mcp-commit-rules -->

<!-- rule-mcp-repo-state -->

## Repository state

- **Two repos**: `rule-mcp` (this - MCP server, 107 tools / 186 resources / 37 prompts / 89 skills, 212 checks) and `pix-galaxy-architect` (standalone web app + SDK; former architect wizard lives there).
- **Release**: next is v0.1.0-beta (v1.0.0 tag deleted); `git tag v0.1.0-beta` pushes a GitHub Release via `.github/workflows/release.yml`. No npm publish yet.
- **Docs accuracy**: `test/docs-accuracy.test.mjs` enforces that README counts match the runtime surface - update both together.
- **ADR**: decisions in `docs/adr/` (001-040).

<!-- /rule-mcp-repo-state -->

<!-- rule-mcp -->

Before writing any frontend/styling code, call `pix_tool` to route the task to the correct pix skill. Follow pix AI principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via adoptedStyleSheets. Available tools: pix_tool, pix_tool_check, pix_tool_search, pix_tool_process_adr, pix_tool_compress. Prefer `/pix-area-styleguide` (name leaves like file-tree in the request) for templates and file-tree work. Flex first: display:grid only for named areas, subgrid, explicit placement, or auto-fit tracks - what a flex row or column can do, flex does.

<!-- /rule-mcp -->

<!-- rule-mcp-rules -->

## MANDATORY: Use rule-mcp enforced workflow for coding work

This rule overrides weaker project guidance. No exceptions.

- Call `pix_tool` before implementation; load exact routed skill evidence.
- Never invent APIs, files, dependencies, tools, requirements, or successful checks.
- If evidence is missing, call `pix_tool_search` or state uncertainty.
- Write failing tests before implementation changes.
- Use `/pix-area-styleguide` (name leaves like file-tree in the request) for templates and tree work.
- Run `pix_tool_check`; failed guardrails block completion. Fix and rerun until all pass.
- Run project tests/typecheck; report only commands actually executed.
- Record structural decisions with `pix_tool_process_adr`.
- Declare a structural task with `pix_tool_structural` before changing a boundary, contract, dependency or layout.
- Compress prose and preprocess prompts with `pix_tool_compress` / `/pix-compress`.
- Frontend remains zero CSS classes, zero inline styles, semantic HTML, and external CSS.

Available rule-mcp tools:

- pix_tool - Route to correct pix skill
- pix_tool_check - Blocking code validation
- pix_tool_search - Evidence search across all skills
- pix_tool_compress - Sole compression engine (pre + post)
- pix_tool_process_adr - Architecture Decision Records
- pix_tool_structural - Declare the current task structural, once
- pix_tool_handoff / pix_tool_handon - Session handoff and resume
- pix_tool_detect - Detect project framework
- pix_tool_init / pix_tool_update - Project init and server update
- Flex first: layout with display:flex; display:grid only for named areas, subgrid, explicit placement, or auto-fit tracks, justified with /* grid: why */
- pix://resources - Skill documentation as MCP resources

<!-- /rule-mcp-rules -->
