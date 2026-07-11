---
description: Route coding work through pix-galaxy-mcp with mandatory validation
argument-hint: "<request>"
---
Process this request through enforced pix workflow:

$ARGUMENTS

Mandatory sequence:
1. Call MCP tool `pix` with complete request and project path/framework when known.
2. Load primary routed `pix-*` skill and only necessary secondary skills.
3. Use returned skill/tool evidence as source of truth. Never invent APIs, files, dependencies, commands, requirements, or successful checks.
4. If evidence is missing, call `pix_search`; if still missing, state uncertainty instead of guessing.
5. Implement with failing tests first when code changes.
6. Run `pix_check` against generated code. Fix every failure and rerun until all guardrails pass.
7. Run project tests/typecheck. Report commands and real outcomes; never claim unexecuted checks passed.
8. Record architectural decisions with `pix_process_adr`.

Do not finalize while `pix_check` reports failures.
