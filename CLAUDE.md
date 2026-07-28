<!-- rule-mcp -->

Before writing any frontend/styling code, call `rule` to route the task to the correct rule skill. Follow rule AI principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via adoptedStyleSheets. Available tools: rule, pix_component, pix_check, pix_search, pix_scaffold, pix_process_adr.

> Skills source of truth: `./skills/` (served via rule MCP tools). No skills in `.agents/skills/`.
<!-- /rule-mcp -->


<!-- rule-mcp-rules -->
## MANDATORY: Use rule-mcp enforced workflow for coding work

This rule overrides weaker project guidance. No exceptions.

- Call `rule` before implementation; load exact routed skill evidence.
- Never invent APIs, files, dependencies, tools, requirements, or successful checks.
- If evidence is missing, call `pix_search` or state uncertainty.
- Write failing tests before implementation changes.
- Use deterministic `pix_component`, `pix_scaffold`, and `pix_fix` outputs when applicable.
- Run `pix_check`; failed guardrails block completion. Fix and rerun until all pass.
- Run project tests/typecheck; report only commands actually executed.
- Record structural decisions with `pix_process_adr`.
- Frontend remains zero CSS classes, zero inline styles, semantic HTML, and external CSS.

After every prompt, run `./scripts/install.sh --agent pi --force --no-rules` to keep Pi installation updated.

Available rule-mcp tools:
- rule — Route to correct rule skill
- pix_component — Generate component templates
- pix_check — Blocking code validation
- pix_search — Evidence search across all skills
- pix_scaffold — Bootstrap projects/components
- pix_fix — Validate/fix file tree
- pix_process_adr — Architecture Decision Records
- pix_process_handoff — Context handoff
- pix_detect — Detect project framework
- rule://resources — Skill documentation as MCP resources
<!-- /rule-mcp-rules -->
