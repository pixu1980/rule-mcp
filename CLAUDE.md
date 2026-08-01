<!-- pix-galaxy-mcp -->

Before writing any frontend/styling code, call `pix` to route the task to the correct pix skill. Follow pix AI principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via adoptedStyleSheets. Available tools: pix, pix_component, pix_check, pix_search, pix_scaffold, pix_process_adr.

> Skills source of truth: `./skills/` (served via pix MCP tools). No skills in `.agents/skills/`.
<!-- /pix-galaxy-mcp -->






<!-- pix-galaxy-mcp-commit-rules -->
## MANDATORY: commit scope

Every commit MUST use conventional commits **with a scope**: `type(scope): subject` (e.g. `feat(skills): ...`, `chore(config): ...`, `docs(project): ...`).

Commits without a scope (e.g. `docs: ...`) are rejected by the `commit-msg` hook (`.githooks/commit-msg`). Generated merge/revert messages are exempt.
<!-- /pix-galaxy-mcp-commit-rules -->

<!-- pix-galaxy-mcp-rules -->
## MANDATORY: Use pix-galaxy-mcp enforced workflow for coding work

This rule overrides weaker project guidance. No exceptions.

- Call `pix` before implementation; load exact routed skill evidence.
- Never invent APIs, files, dependencies, tools, requirements, or successful checks.
- If evidence is missing, call `pix_search` or state uncertainty.
- Write failing tests before implementation changes.
- Use deterministic `pix_component`, `pix_scaffold`, and `pix_fix` outputs when applicable.
- Run `pix_check`; failed guardrails block completion. Fix and rerun until all pass.
- Run project tests/typecheck; report only commands actually executed.
- Record structural decisions with `pix_process_adr`.
- Frontend remains zero CSS classes, zero inline styles, semantic HTML, and external CSS.

Available pix-galaxy-mcp tools:
- pix — Route to correct pix skill
- pix_component — Generate component templates
- pix_check — Blocking code validation
- pix_search — Evidence search across all skills
- pix_scaffold — Bootstrap projects/components
- pix_fix — Validate/fix file tree
- pix_process_adr — Architecture Decision Records
- pix_process_handoff — Context handoff
- pix_detect — Detect project framework
- pix://resources — Skill documentation as MCP resources
<!-- /pix-galaxy-mcp-rules -->
