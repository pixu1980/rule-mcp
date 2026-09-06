---
description: Route coding work through rule with strongly recommended validation
argument-hint: "<request>"
---

Process this request through the recommended rule workflow:

$ARGUMENTS

Strongly recommended sequence:

1. Call MCP tool `pix_tool` with complete request and project path/framework when known.
2. Load primary routed `rule-*` skill and only necessary secondary skills.
3. Use returned skill/tool evidence as source of truth. Never invent APIs, files, dependencies, commands, requirements, or successful checks.
4. If evidence is missing, call `rule_tool_search`; if still missing, state uncertainty instead of guessing.
5. Implement with failing tests first when code changes. Write every comment, identifier and generated document in English, American spelling (color, behavior, organize). Caveman mode is implicit: if the user is in caveman mode, keep the response compressed.
6. Run `rule_tool_check` against generated code. Fix every failure and rerun until all guardrails pass.
7. Run project tests/typecheck. Report commands and real outcomes; never claim unexecuted checks passed.
8. Record architectural decisions with `rule_tool_process_adr`.

Note: MCP servers cannot enforce tool invocation order. This sequence is advisory and depends on the model following these instructions.
